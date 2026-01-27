import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../../database/entities';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    @InjectRepository(Channel)
    private readonly channelRepository: Repository<Channel>,
  ) {}

  /**
   * Get all channels (for admin)
   */
  async getAllChannels(): Promise<Channel[]> {
    return this.channelRepository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get active channels
   */
  async getActiveChannels(): Promise<Channel[]> {
    return this.channelRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Get channel by ID
   */
  async getChannelById(id: string): Promise<Channel | null> {
    return this.channelRepository.findOne({ where: { id } });
  }

  /**
   * Create new channel
   */
  async createChannel(data: {
    name: string;
    telegramChannelId: number;
    telegramChannelUsername?: string;
    price: number;
    durationDays: number;
    description?: string;
  }): Promise<Channel> {
    const channel = this.channelRepository.create({
      name: data.name,
      telegramChannelId: data.telegramChannelId,
      telegramChannelUsername: data.telegramChannelUsername || null,
      price: data.price,
      durationDays: data.durationDays,
      description: data.description || null,
      isActive: true,
    });

    return this.channelRepository.save(channel);
  }

  /**
   * Update channel
   */
  async updateChannel(
    id: string,
    data: Partial<Pick<Channel, 'name' | 'description' | 'telegramChannelId' | 'telegramChannelUsername' | 'price' | 'durationDays' | 'isActive' | 'sortOrder'>>,
  ): Promise<Channel | null> {
    await this.channelRepository.update(id, data);
    return this.getChannelById(id);
  }

  /**
   * Toggle channel active status
   */
  async toggleChannelStatus(id: string): Promise<Channel | null> {
    const channel = await this.getChannelById(id);
    if (!channel) return null;

    channel.isActive = !channel.isActive;
    return this.channelRepository.save(channel);
  }

  /**
   * Delete channel
   */
  async deleteChannel(id: string): Promise<boolean> {
    const result = await this.channelRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  /**
   * Get channels count
   */
  async getChannelsCount(): Promise<number> {
    return this.channelRepository.count();
  }
}
