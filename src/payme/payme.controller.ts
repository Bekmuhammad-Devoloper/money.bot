import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PaymeService, PaymeRequest, PaymeResponse, PaymeErrorCode } from './payme.service';

@Controller('payme')
export class PaymeController {
  private readonly logger = new Logger(PaymeController.name);

  constructor(private readonly paymeService: PaymeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePaymeCallback(
    @Body() request: PaymeRequest,
    @Headers('authorization') authHeader: string,
  ): Promise<PaymeResponse> {
    this.logger.log(`Payme callback received: ${request.method}`);

    // Verify authorization
    if (!this.paymeService.verifyAuthorization(authHeader)) {
      this.logger.warn('Unauthorized Payme request');
      return {
        error: {
          code: PaymeErrorCode.AUTHORIZATION_ERROR,
          message: {
            ru: 'Неверная авторизация',
            uz: 'Noto\'g\'ri avtorizatsiya',
            en: 'Invalid authorization',
          },
        },
        id: request.id,
      };
    }

    // Handle the request
    return this.paymeService.handleRequest(request);
  }
}
