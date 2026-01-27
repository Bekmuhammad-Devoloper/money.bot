import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { User, Subscription, Channel } from '../../database/entities';

@Injectable()
export class ExcelService {
  private readonly logger = new Logger(ExcelService.name);

  /**
   * Export subscribed users to Excel
   */
  async exportSubscribedUsers(
    data: Array<{
      user: User;
      subscription: Subscription;
      channel: Channel;
    }>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PulOqimi Bot';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Obunadorlar');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Telegram ID', key: 'telegramId', width: 15 },
      { header: 'Ism', key: 'name', width: 25 },
      { header: 'Telefon', key: 'phone', width: 18 },
      { header: 'Kanal', key: 'channel', width: 25 },
      { header: "Ro'yxatdan o'tgan sana", key: 'registrationDate', width: 20 },
      { header: 'Obuna boshlanish', key: 'startDate', width: 20 },
      { header: 'Obuna tugash', key: 'endDate', width: 20 },
      { header: 'Holati', key: 'status', width: 15 },
      { header: 'Qolgan kunlar', key: 'daysLeft', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    headerRow.alignment = { horizontal: 'center' };

    // Add data
    let rowIndex = 1;
    for (const item of data) {
      const daysLeft = item.subscription.endDate
        ? Math.ceil(
            (item.subscription.endDate.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      worksheet.addRow({
        id: rowIndex++,
        telegramId: item.user.telegramId.toString(),
        name: item.user.fullName,
        phone: item.user.phoneNumber,
        channel: item.channel?.name || 'N/A',
        registrationDate: item.user.createdAt?.toLocaleDateString('uz-UZ'),
        startDate: item.subscription.startDate?.toLocaleDateString('uz-UZ'),
        endDate: item.subscription.endDate?.toLocaleDateString('uz-UZ'),
        status: item.subscription.status,
        daysLeft: Math.max(0, daysLeft),
      });
    }

    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export interested users (registered but not subscribed) to Excel
   */
  async exportInterestedUsers(users: User[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PulOqimi Bot';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Qiziquvchilar');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Telegram ID', key: 'telegramId', width: 15 },
      { header: 'Ism', key: 'name', width: 25 },
      { header: 'Telefon', key: 'phone', width: 18 },
      { header: 'Username', key: 'username', width: 20 },
      { header: "Ro'yxatdan o'tgan sana", key: 'registrationDate', width: 20 },
      { header: 'Holati', key: 'status', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '70AD47' },
    };
    headerRow.alignment = { horizontal: 'center' };

    // Add data
    let rowIndex = 1;
    for (const user of users) {
      worksheet.addRow({
        id: rowIndex++,
        telegramId: user.telegramId.toString(),
        name: user.fullName,
        phone: user.phoneNumber,
        username: user.username || 'N/A',
        registrationDate: user.createdAt?.toLocaleDateString('uz-UZ'),
        status: user.status,
      });
    }

    // Add borders
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
