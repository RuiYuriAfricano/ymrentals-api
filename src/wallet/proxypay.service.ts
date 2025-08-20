import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ProxyPayConfig {
  apiUrl: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
  merchantId: string;
  entityId: string;
  fetchPaymentsInMinutes: number;
  webhookSecret?: string;
}

interface ProxyPayDepositRequest {
  amount: number;
  currency: string;
  description: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  paymentMethod: string;
  callbackUrl?: string;
  returnUrl?: string;
}

interface ProxyPayWithdrawalRequest {
  amount: number;
  currency: string;
  description: string;
  destination: {
    accountNumber: string;
    bankName?: string;
    accountHolder: string;
  };
  withdrawalMethod: string;
}

export interface ProxyPayResponse {
  success: boolean;
  transactionId: string;
  reference: string;
  status: string;
  paymentUrl?: string;
  message?: string;
  error?: string;
}

@Injectable()
export class ProxyPayService {
  private readonly logger = new Logger(ProxyPayService.name);
  private readonly config: ProxyPayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      apiUrl: this.configService.get<string>('PROXYPAY_API_URL', 'https://api.sandbox.proxypay.co.ao'),
      apiKey: this.configService.get<string>('PROXYPAY_API_KEY', 'zrbb6u34fdaxd73dghph6rqfkphpxuij'),
      environment: this.configService.get<'sandbox' | 'production'>('PROXYPAY_ENVIRONMENT', 'sandbox'),
      merchantId: this.configService.get<string>('PROXYPAY_MERCHANT_ID', '01005'),
      entityId: this.configService.get<string>('PROXYPAY_ENTITY_ID', '01005'),
      fetchPaymentsInMinutes: this.configService.get<number>('PROXYPAY_FETCH_PAYMENTS_MINUTES', 10),
      webhookSecret: this.configService.get<string>('PROXYPAY_WEBHOOK_SECRET'),
    };
  }

  /**
   * Criar depósito via ProxyPay
   */
  async createDeposit(request: ProxyPayDepositRequest): Promise<ProxyPayResponse> {
    try {
      this.logger.log(`Creating ProxyPay deposit for amount: ${request.amount} AOA`);

      // Gerar um ID único para a referência
      const referenceId = await this.generateReferenceId();

      // Calcular data de expiração (7 dias a partir de hoje)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      const endDatetime = expiryDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      // Criar referência no ProxyPay usando a API v2
      const referenceData = {
        amount: request.amount.toFixed(2),
        end_datetime: endDatetime,
        custom_fields: {
          customer_name: request.customer.name,
          customer_email: request.customer.email,
          customer_phone: request.customer.phone || '',
          payment_method: request.paymentMethod,
          description: request.description,
          callback_url: request.callbackUrl || `${process.env.API_URL}/wallet/webhook/proxypay`,
        }
      };

      await this.makeApiCall(`/references/${referenceId}`, 'PUT', referenceData);

      // Construir URL de pagamento baseada no ambiente
      const paymentUrl = this.config.environment === 'production'
        ? `https://proxypay.co.ao/payment/${this.config.entityId}/${referenceId}`
        : `https://sandbox.proxypay.co.ao/payment/${this.config.entityId}/${referenceId}`;

      return {
        success: true,
        transactionId: referenceId.toString(),
        reference: referenceId.toString(),
        status: 'pending',
        paymentUrl: paymentUrl,
        message: 'Reference created successfully',
      };
    } catch (error) {
      this.logger.error(`ProxyPay deposit error: ${error.message}`, error.stack);
      return {
        success: false,
        transactionId: '',
        reference: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Criar saque via ProxyPay
   */
  async createWithdrawal(request: ProxyPayWithdrawalRequest): Promise<ProxyPayResponse> {
    try {
      this.logger.log(`Creating ProxyPay withdrawal for amount: ${request.amount} AOA`);

      // Se estiver em modo sandbox, retornar resposta simulada
      if (this.config.environment === 'sandbox') {
        return this.simulateWithdrawalResponse(request);
      }

      // Integração real com ProxyPay API
      const response = await this.makeApiCall('/withdrawals', 'POST', {
        amount: request.amount,
        currency: request.currency || 'AOA',
        description: request.description,
        destination: request.destination,
        withdrawal_method: request.withdrawalMethod,
        merchant_id: this.config.merchantId,
      });

      return {
        success: response.success,
        transactionId: response.transaction_id,
        reference: response.reference,
        status: response.status,
        message: response.message,
      };
    } catch (error) {
      this.logger.error(`ProxyPay withdrawal error: ${error.message}`, error.stack);
      return {
        success: false,
        transactionId: '',
        reference: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Verificar status de uma transação
   */
  async checkTransactionStatus(transactionId: string): Promise<ProxyPayResponse> {
    try {
      this.logger.log(`Checking ProxyPay transaction status: ${transactionId}`);

      const response = await this.makeApiCall(`/payments/${transactionId}`, 'GET');

      return {
        success: true,
        transactionId: response.id || transactionId,
        reference: response.reference,
        status: response.status,
        message: response.message || 'Status retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`ProxyPay status check error: ${error.message}`, error.stack);
      return {
        success: false,
        transactionId,
        reference: '',
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Gerar ID de referência único via ProxyPay API
   */
  private async generateReferenceId(): Promise<number> {
    try {
      const response = await this.makeApiCall('/reference_ids', 'POST');
      return response; // A API retorna diretamente o número
    } catch (error) {
      // Se falhar, gerar um ID local (não recomendado para produção)
      this.logger.warn('Failed to generate reference ID via API, using local generation');
      return Math.floor(Math.random() * 900000000) + 100000000; // 9 dígitos
    }
  }

  /**
   * Buscar pagamentos recentes do ProxyPay
   */
  async fetchRecentPayments(): Promise<any[]> {
    try {
      this.logger.log('Fetching recent payments from ProxyPay');

      const response = await this.makeApiCall('/payments', 'GET');

      // A API v2 retorna um array diretamente
      return Array.isArray(response) ? response : [];
    } catch (error) {
      this.logger.error(`ProxyPay fetch payments error: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Fazer chamada para a API do ProxyPay
   */
  private async makeApiCall(endpoint: string, method: string, data?: any): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.config.apiKey}`,
        'Accept': 'application/vnd.proxypay.v2+json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    this.logger.log(`ProxyPay API Call: ${method} ${url}`);
    this.logger.log(`ProxyPay Request Data:`, data);

    const response = await fetch(url, options);

    this.logger.log(`ProxyPay Response Status: ${response.status}`);

    // Para PUT /references/{id}, uma resposta 204 (No Content) indica sucesso
    if (response.status === 204) {
      return { success: true };
    }

    let responseData;
    try {
      responseData = await response.json();
      this.logger.log(`ProxyPay Response Data:`, responseData);
    } catch (error) {
      // Se não conseguir fazer parse do JSON, pode ser uma resposta vazia (204)
      if (response.ok) {
        return { success: true };
      }
      throw new Error(`ProxyPay API error: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(`ProxyPay API error: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  /**
   * Simular resposta de depósito (modo sandbox)
   */
  private simulateDepositResponse(request: ProxyPayDepositRequest): ProxyPayResponse {
    const transactionId = `PP_DEP_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const reference = `REF_${transactionId}`;

    return {
      success: true,
      transactionId,
      reference,
      status: 'pending',
      paymentUrl: `https://sandbox.proxypay.co.ao/payment/${transactionId}`,
      message: 'Depósito criado com sucesso (sandbox)',
    };
  }

  /**
   * Simular resposta de saque (modo sandbox)
   */
  private simulateWithdrawalResponse(request: ProxyPayWithdrawalRequest): ProxyPayResponse {
    const transactionId = `PP_WIT_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const reference = `REF_${transactionId}`;

    return {
      success: true,
      transactionId,
      reference,
      status: 'processing',
      message: 'Saque criado com sucesso (sandbox)',
    };
  }

  /**
   * Webhook para receber notificações do ProxyPay
   */
  async handleWebhook(payload: any): Promise<void> {
    try {
      this.logger.log('Received ProxyPay webhook', payload);

      // Verificar assinatura do webhook (implementar validação de segurança)
      // const isValid = this.validateWebhookSignature(payload);
      // if (!isValid) {
      //   throw new Error('Invalid webhook signature');
      // }

      // Processar notificação baseada no tipo de evento
      switch (payload.event_type) {
        case 'payment.completed':
          await this.handlePaymentCompleted(payload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;
        case 'withdrawal.completed':
          await this.handleWithdrawalCompleted(payload);
          break;
        case 'withdrawal.failed':
          await this.handleWithdrawalFailed(payload);
          break;
        default:
          this.logger.warn(`Unknown webhook event type: ${payload.event_type}`);
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePaymentCompleted(payload: any): Promise<void> {
    this.logger.log(`Payment completed: ${payload.transaction_id}`);
    // Implementar lógica para atualizar status da transação na base de dados
  }

  private async handlePaymentFailed(payload: any): Promise<void> {
    this.logger.log(`Payment failed: ${payload.transaction_id}`);
    // Implementar lógica para marcar transação como falhada
  }

  private async handleWithdrawalCompleted(payload: any): Promise<void> {
    this.logger.log(`Withdrawal completed: ${payload.transaction_id}`);
    // Implementar lógica para confirmar saque
  }

  private async handleWithdrawalFailed(payload: any): Promise<void> {
    this.logger.log(`Withdrawal failed: ${payload.transaction_id}`);
    // Implementar lógica para reverter saque falhado
  }
}
