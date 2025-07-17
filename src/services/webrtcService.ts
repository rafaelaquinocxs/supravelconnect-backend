import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configuração do AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Interface para configuração do WebRTC
interface WebRTCConfig {
  bucketName: string;
  region: string;
  retentionDays: number;
}

class WebRTCService {
  private config: WebRTCConfig;

  constructor() {
    this.config = {
      bucketName: process.env.AWS_S3_BUCKET || 'supravel-recordings',
      region: process.env.AWS_REGION || 'us-east-1',
      retentionDays: 3 // Retenção de 3 dias conforme solicitado
    };
  }

  // Gerar URL pré-assinada para upload de gravação
  async generateUploadUrl(sessionId: string): Promise<string> {
    const key = `recordings/${sessionId}/${uuidv4()}.webm`;
    
    const params = {
      Bucket: this.config.bucketName,
      Key: key,
      ContentType: 'video/webm',
      Expires: 3600 // URL válida por 1 hora
    };

    try {
      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
      return uploadUrl;
    } catch (error) {
      console.error('Erro ao gerar URL para upload:', error);
      throw new Error('Falha ao gerar URL para upload da gravação');
    }
  }

  // Gerar URL pré-assinada para visualização de gravação
  async generateViewUrl(recordingKey: string): Promise<string> {
    const params = {
      Bucket: this.config.bucketName,
      Key: recordingKey,
      Expires: 3600 // URL válida por 1 hora
    };

    try {
      const viewUrl = await s3.getSignedUrlPromise('getObject', params);
      return viewUrl;
    } catch (error) {
      console.error('Erro ao gerar URL para visualização:', error);
      throw new Error('Falha ao gerar URL para visualização da gravação');
    }
  }

  // Salvar metadados da gravação
  async saveRecordingMetadata(sessionId: string, recordingKey: string): Promise<string> {
    // Aqui você pode salvar os metadados no banco de dados
    // Por exemplo, atualizar o modelo de sessão com a URL da gravação
    
    // Retornar a chave da gravação
    return recordingKey;
  }

  // Configurar expiração automática das gravações (3 dias)
  async configureRecordingExpiration(recordingKey: string): Promise<void> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.config.retentionDays);

    const params = {
      Bucket: this.config.bucketName,
      Key: recordingKey,
      Expires: expirationDate
    };

    try {
      await s3.putObjectTagging({
        Bucket: this.config.bucketName,
        Key: recordingKey,
        Tagging: {
          TagSet: [
            {
              Key: 'ExpirationDate',
              Value: expirationDate.toISOString()
            }
          ]
        }
      }).promise();
    } catch (error) {
      console.error('Erro ao configurar expiração da gravação:', error);
      throw new Error('Falha ao configurar expiração da gravação');
    }
  }

  // Listar gravações de uma sessão
  async listSessionRecordings(sessionId: string): Promise<string[]> {
    const params = {
      Bucket: this.config.bucketName,
      Prefix: `recordings/${sessionId}/`
    };

    try {
      const data = await s3.listObjectsV2(params).promise();
      const recordings = data.Contents?.map(item => item.Key || '') || [];
      return recordings;
    } catch (error) {
      console.error('Erro ao listar gravações da sessão:', error);
      throw new Error('Falha ao listar gravações da sessão');
    }
  }

  // Excluir uma gravação
  async deleteRecording(recordingKey: string): Promise<void> {
    const params = {
      Bucket: this.config.bucketName,
      Key: recordingKey
    };

    try {
      await s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Erro ao excluir gravação:', error);
      throw new Error('Falha ao excluir gravação');
    }
  }
}

export default new WebRTCService();
