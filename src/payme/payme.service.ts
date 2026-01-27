import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Payment, PaymentStatus, Subscription, SubscriptionStatus, User, UserStatus, Channel } from '../database/entities';

// Payme Error Codes
export enum PaymeErrorCode {
  INVALID_AMOUNT = -31001,
  TRANSACTION_NOT_FOUND = -31003,
  INVALID_ACCOUNT = -31050,
  ALREADY_DONE = -31060,
  UNABLE_TO_PERFORM = -31008,
  INVALID_JSON_RPC = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  AUTHORIZATION_ERROR = -32504,
}

export interface PaymeRequest {
  method: string;
  params: Record<string, unknown>;
  id: number;
}

export interface PaymeResponse {
  result?: unknown;
  error?: {
    code: number;
    message: { ru: string; uz: string; en: string };
    data?: unknown;
  };
  id: number;
}

export interface CreateTransactionParams {
  id: string;
  time: number;
  amount: number;
  account: {
    order_id: string;
  };
}

export interface PerformTransactionParams {
  id: string;
}

export interface CancelTransactionParams {
  id: string;
  reason: number;
}

export interface CheckTransactionParams {
  id: string;
}

export interface GetStatementParams {
  from: number;
  to: number;
}

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly testSecretKey: string;
  private readonly checkoutUrl: string;
  private readonly isTest: boolean;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
  ) {
    this.merchantId = this.configService.get<string>('payme.merchantId') || '';
    this.secretKey = this.configService.get<string>('payme.secretKey') || '';
    this.testSecretKey = this.configService.get<string>('payme.testSecretKey') || '';
    this.checkoutUrl = this.configService.get<string>('payme.checkoutUrl') || 'https://checkout.paycom.uz';
    this.isTest = this.configService.get<boolean>('payme.isTest') || false;
  }

  /**
   * Verify authorization header from Payme
   */
  verifyAuthorization(authHeader: string | undefined): boolean {
    if (!authHeader) return false;

    try {
      const [type, credentials] = authHeader.split(' ');
      if (type !== 'Basic') return false;

      const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
      const [login, key] = decoded.split(':');

      if (login !== 'Paycom') return false;

      const expectedKey = this.isTest ? this.testSecretKey : this.secretKey;
      return key === expectedKey;
    } catch {
      return false;
    }
  }

  /**
   * Create a payment URL for the user
   */
  async createPaymentUrl(
    userId: string,
    channelId: string,
    amount: number,
  ): Promise<{ paymentUrl: string; orderId: string; paymentId: string }> {
    const orderId = `order_${Date.now()}_${uuidv4().slice(0, 8)}`;

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      channelId,
      orderId,
      amount,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepository.save(payment);

    // Generate Payme checkout URL
    // Amount in tiyin (1 sum = 100 tiyin)
    const amountInTiyin = Math.round(amount * 100);
    
    const params = Buffer.from(
      `m=${this.merchantId};ac.order_id=${orderId};a=${amountInTiyin}`,
    ).toString('base64');

    const paymentUrl = `${this.checkoutUrl}/${params}`;

    // Update payment with URL
    payment.paymentUrl = paymentUrl;
    await this.paymentRepository.save(payment);

    return {
      paymentUrl,
      orderId,
      paymentId: payment.id,
    };
  }

  /**
   * Handle Payme JSON-RPC request
   */
  async handleRequest(request: PaymeRequest): Promise<PaymeResponse> {
    this.logger.log(`Payme request: ${request.method}`);

    try {
      switch (request.method) {
        case 'CheckPerformTransaction':
          return this.checkPerformTransaction(request);
        case 'CreateTransaction':
          return this.createTransaction(request);
        case 'PerformTransaction':
          return this.performTransaction(request);
        case 'CancelTransaction':
          return this.cancelTransaction(request);
        case 'CheckTransaction':
          return this.checkTransaction(request);
        case 'GetStatement':
          return this.getStatement(request);
        default:
          return this.errorResponse(
            request.id,
            PaymeErrorCode.METHOD_NOT_FOUND,
            'Method not found',
          );
      }
    } catch (error) {
      this.logger.error(`Payme error: ${error}`);
      return this.errorResponse(
        request.id,
        PaymeErrorCode.INTERNAL_ERROR,
        'Internal server error',
      );
    }
  }

  /**
   * CheckPerformTransaction - Verify if transaction can be performed
   */
  private async checkPerformTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    const params = request.params as { amount: number; account: { order_id: string } };
    
    if (!params.account?.order_id) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.INVALID_ACCOUNT,
        'Order ID not provided',
      );
    }

    const payment = await this.paymentRepository.findOne({
      where: { orderId: params.account.order_id },
    });

    if (!payment) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.INVALID_ACCOUNT,
        'Order not found',
      );
    }

    // Verify amount (in tiyin)
    const expectedAmount = Math.round(Number(payment.amount) * 100);
    if (params.amount !== expectedAmount) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.INVALID_AMOUNT,
        'Invalid amount',
      );
    }

    return {
      result: { allow: true },
      id: request.id,
    };
  }

  /**
   * CreateTransaction - Create a new transaction
   */
  private async createTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    const params = request.params as unknown as CreateTransactionParams;

    const payment = await this.paymentRepository.findOne({
      where: { orderId: params.account.order_id },
    });

    if (!payment) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.INVALID_ACCOUNT,
        'Order not found',
      );
    }

    // Check if already has a transaction
    if (payment.paymeTransactionId && payment.paymeTransactionId !== params.id) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.ALREADY_DONE,
        'Transaction already exists for this order',
      );
    }

    // Verify amount
    const expectedAmount = Math.round(Number(payment.amount) * 100);
    if (params.amount !== expectedAmount) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.INVALID_AMOUNT,
        'Invalid amount',
      );
    }

    // Check if payment is already completed or cancelled
    if (payment.status === PaymentStatus.COMPLETED) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.ALREADY_DONE,
        'Transaction already completed',
      );
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.UNABLE_TO_PERFORM,
        'Transaction was cancelled',
      );
    }

    // Update payment with Payme transaction info
    payment.paymeTransactionId = params.id;
    payment.paymeTransactionTime = new Date(params.time);
    payment.status = PaymentStatus.PROCESSING;
    await this.paymentRepository.save(payment);

    return {
      result: {
        create_time: payment.paymeTransactionTime?.getTime(),
        transaction: payment.id,
        state: 1,
      },
      id: request.id,
    };
  }

  /**
   * PerformTransaction - Complete the transaction
   */
  private async performTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    const params = request.params as unknown as PerformTransactionParams;

    const payment = await this.paymentRepository.findOne({
      where: { paymeTransactionId: params.id },
      relations: ['user'],
    });

    if (!payment) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    // If already completed, return success
    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        result: {
          transaction: payment.id,
          perform_time: payment.performTime?.getTime(),
          state: 2,
        },
        id: request.id,
      };
    }

    // If cancelled, return error
    if (payment.status === PaymentStatus.CANCELLED) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.UNABLE_TO_PERFORM,
        'Transaction was cancelled',
      );
    }

    // Complete the payment
    payment.status = PaymentStatus.COMPLETED;
    payment.performTime = new Date();
    await this.paymentRepository.save(payment);

    // Activate subscription
    await this.activateSubscription(payment);

    this.logger.log(`Payment completed: ${payment.orderId}`);

    return {
      result: {
        transaction: payment.id,
        perform_time: payment.performTime.getTime(),
        state: 2,
      },
      id: request.id,
    };
  }

  /**
   * Activate subscription after successful payment
   */
  private async activateSubscription(payment: Payment): Promise<void> {
    if (!payment.channelId) return;

    const channel = await this.channelRepository.findOne({
      where: { id: payment.channelId },
    });

    if (!channel) return;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + channel.durationDays);

    // Check if subscription already exists
    let subscription = await this.subscriptionRepository.findOne({
      where: {
        userId: payment.userId,
        channelId: payment.channelId,
      },
    });

    if (subscription) {
      // Extend existing subscription
      if (subscription.endDate && subscription.endDate > now) {
        // Add duration to existing end date
        subscription.endDate.setDate(subscription.endDate.getDate() + channel.durationDays);
      } else {
        subscription.startDate = now;
        subscription.endDate = endDate;
      }
      subscription.status = SubscriptionStatus.ACTIVE;
    } else {
      // Create new subscription
      subscription = this.subscriptionRepository.create({
        userId: payment.userId,
        channelId: payment.channelId,
        startDate: now,
        endDate,
        status: SubscriptionStatus.ACTIVE,
      });
    }

    await this.subscriptionRepository.save(subscription);

    // Update payment with subscription ID
    payment.subscriptionId = subscription.id;
    await this.paymentRepository.save(payment);

    // Update user status
    await this.userRepository.update(payment.userId, {
      status: UserStatus.ACTIVE,
    });
  }

  /**
   * CancelTransaction - Cancel a transaction
   */
  private async cancelTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    const params = request.params as unknown as CancelTransactionParams;

    const payment = await this.paymentRepository.findOne({
      where: { paymeTransactionId: params.id },
    });

    if (!payment) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    // If already cancelled
    if (payment.status === PaymentStatus.CANCELLED) {
      return {
        result: {
          transaction: payment.id,
          cancel_time: payment.cancelTime?.getTime(),
          state: payment.performTime ? -2 : -1,
        },
        id: request.id,
      };
    }

    // If completed, we might need to handle refund
    const wasCompleted = payment.status === PaymentStatus.COMPLETED;

    payment.status = PaymentStatus.CANCELLED;
    payment.cancelTime = new Date();
    payment.cancelReason = params.reason;
    await this.paymentRepository.save(payment);

    // If was completed, update subscription
    if (wasCompleted && payment.subscriptionId) {
      await this.subscriptionRepository.update(payment.subscriptionId, {
        status: SubscriptionStatus.CANCELLED,
      });
    }

    return {
      result: {
        transaction: payment.id,
        cancel_time: payment.cancelTime.getTime(),
        state: wasCompleted ? -2 : -1,
      },
      id: request.id,
    };
  }

  /**
   * CheckTransaction - Get transaction status
   */
  private async checkTransaction(request: PaymeRequest): Promise<PaymeResponse> {
    const params = request.params as unknown as CheckTransactionParams;

    const payment = await this.paymentRepository.findOne({
      where: { paymeTransactionId: params.id },
    });

    if (!payment) {
      return this.errorResponse(
        request.id,
        PaymeErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
      );
    }

    let state: number;
    switch (payment.status) {
      case PaymentStatus.PROCESSING:
        state = 1;
        break;
      case PaymentStatus.COMPLETED:
        state = 2;
        break;
      case PaymentStatus.CANCELLED:
        state = payment.performTime ? -2 : -1;
        break;
      default:
        state = 0;
    }

    return {
      result: {
        create_time: payment.paymeTransactionTime?.getTime(),
        perform_time: payment.performTime?.getTime() || 0,
        cancel_time: payment.cancelTime?.getTime() || 0,
        transaction: payment.id,
        state,
        reason: payment.cancelReason,
      },
      id: request.id,
    };
  }

  /**
   * GetStatement - Get list of transactions for a period
   */
  private async getStatement(request: PaymeRequest): Promise<PaymeResponse> {
    const params = request.params as unknown as GetStatementParams;

    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.paymeTransactionTime >= :from', { from: new Date(params.from) })
      .andWhere('payment.paymeTransactionTime <= :to', { to: new Date(params.to) })
      .andWhere('payment.paymeTransactionId IS NOT NULL')
      .getMany();

    const transactions = payments.map((payment) => {
      let state: number;
      switch (payment.status) {
        case PaymentStatus.PROCESSING:
          state = 1;
          break;
        case PaymentStatus.COMPLETED:
          state = 2;
          break;
        case PaymentStatus.CANCELLED:
          state = payment.performTime ? -2 : -1;
          break;
        default:
          state = 0;
      }

      return {
        id: payment.paymeTransactionId,
        time: payment.paymeTransactionTime?.getTime(),
        amount: Math.round(Number(payment.amount) * 100),
        account: { order_id: payment.orderId },
        create_time: payment.paymeTransactionTime?.getTime(),
        perform_time: payment.performTime?.getTime() || 0,
        cancel_time: payment.cancelTime?.getTime() || 0,
        transaction: payment.id,
        state,
        reason: payment.cancelReason,
      };
    });

    return {
      result: { transactions },
      id: request.id,
    };
  }

  /**
   * Helper to create error response
   */
  private errorResponse(
    id: number,
    code: PaymeErrorCode,
    message: string,
  ): PaymeResponse {
    return {
      error: {
        code,
        message: {
          ru: message,
          uz: message,
          en: message,
        },
      },
      id,
    };
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { orderId },
      relations: ['user'],
    });
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    return payment?.status || null;
  }
}
