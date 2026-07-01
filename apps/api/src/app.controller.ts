import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'API sağlık kontrolü' })
  @ApiResponse({
    status: 200,
    description: "API ayakta ise durum bilgisi döner.",
    schema: {
      example: { status: 'ok', service: 'stockroute-api', timestamp: '2026-07-01T00:00:00.000Z' },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'stockroute-api',
      timestamp: new Date().toISOString(),
    };
  }
}
