import { Request, Response } from 'express';
import Session, { SessionStatus, SessionUrgency, PaymentStatus } from '../models/sessionModel';
import User from '../models/userModel';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Criar nova sessão (agendamento)
// @route   POST /api/sessions/schedule
// @access  Private (Client)
export const scheduleSession = async (req: AuthRequest, res: Response) => {
  try {
    const {
      technicianId,
      title,
      description,
      specialty,
      urgency,
      scheduledDate,
      scheduledTime,
      estimatedDuration,
      issue
    } = req.body;

    // Validar dados obrigatórios
    if (!technicianId || !title || !description || !specialty || !scheduledDate || !scheduledTime || !estimatedDuration || !issue) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }

    // Verificar se o usuário existe e pode receber sessões
    const helper = await User.findById(technicianId);
    if (!helper || helper.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Verificar se o horário está disponível
    const existingSession = await Session.findOne({
      technicianId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: { $in: [SessionStatus.PENDING, SessionStatus.CONFIRMED] }
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'Horário não disponível'
      });
    }

    // Calcular custo estimado
    const hourlyRate = helper.hourlyRate || 80; // valor padrão
    const estimatedCost = (estimatedDuration / 60) * hourlyRate;

    // Criar sessão
    const session = new Session({
      clientId: req.user._id,
      technicianId,
      title,
      description,
      specialty,
      urgency: urgency || SessionUrgency.MEDIUM,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      estimatedDuration,
      issue,
      hourlyRate,
      estimatedCost,
      status: SessionStatus.PENDING
    });

    await session.save();

    // Popular dados para resposta
    await session.populate('technicianId', 'name email specialties rating');

    res.status(201).json({
      success: true,
      message: 'Sessão agendada com sucesso',
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao agendar sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Listar sessões do usuário
// @route   GET /api/sessions
// @access  Private
export const getUserSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Construir query baseada no role
    const query: any = {};
    if (userRole === 'client') {
      query.clientId = userId;
    } else if (userRole === 'technician') {
      query.technicianId = userId;
    }

    // Filtrar por status se fornecido
    if (status) {
      query.status = status;
    }

    // Calcular paginação
    const skip = (Number(page) - 1) * Number(limit);

    // Buscar sessões
    const sessions = await Session.find(query)
      .populate('clientId', 'name email profileImage')
      .populate('technicianId', 'name email profileImage specialties rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Contar total
    const total = await Session.countDocuments(query);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar sessões:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Obter detalhes de uma sessão
// @route   GET /api/sessions/:id
// @access  Private
export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id)
      .populate('clientId', 'name email profileImage phone')
      .populate('technicianId', 'name email profileImage specialties rating phone');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Verificar se o usuário tem acesso à sessão
    const hasAccess = (session as any).clientId._id.toString() === userId.toString() ||
                     (session as any).technicianId._id.toString() === userId.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao buscar sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Aceitar/Rejeitar solicitação de sessão (Técnico)
// @route   POST /api/sessions/:id/respond
// @access  Private (Technician)
export const respondToSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, message } = req.body; // action: 'accept' | 'reject'
    const technicianId = req.user._id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Ação inválida'
      });
    }

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Verificar se é o técnico da sessão
    if (session.technicianId.toString() !== technicianId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se a sessão pode ser modificada
    if (session.status !== SessionStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Sessão não pode ser modificada'
      });
    }

    // Atualizar status
    session.status = action === 'accept' ? SessionStatus.CONFIRMED : SessionStatus.REJECTED;
    
    if (message) {
      (session as any).notes = message;
    }

    await session.save();

    // Popular dados para resposta
    await session.populate('clientId', 'name email');

    res.json({
      success: true,
      message: `Sessão ${action === 'accept' ? 'aceita' : 'rejeitada'} com sucesso`,
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao responder sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Iniciar sessão
// @route   POST /api/sessions/:id/start
// @access  Private (Technician)
export const startSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const technicianId = req.user._id;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Verificar se é o técnico da sessão
    if (session.technicianId.toString() !== technicianId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se a sessão pode ser iniciada (método personalizado ou verificação manual)
    const canStart = (session as any).canStart ? (session as any).canStart() : 
                     session.status === SessionStatus.CONFIRMED;

    if (!canStart) {
      return res.status(400).json({
        success: false,
        message: 'Sessão não pode ser iniciada'
      });
    }

    // Iniciar sessão (método personalizado ou atualização manual)
    if ((session as any).startSession) {
      await (session as any).startSession();
    } else {
      session.status = SessionStatus.IN_PROGRESS;
      (session as any).startTime = new Date();
      await session.save();
    }

    res.json({
      success: true,
      message: 'Sessão iniciada com sucesso',
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao iniciar sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Finalizar sessão
// @route   POST /api/sessions/:id/end
// @access  Private (Technician)
export const endSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;
    const technicianId = req.user._id;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Verificar se é o técnico da sessão
    if (session.technicianId.toString() !== technicianId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se a sessão está em andamento
    if (session.status !== SessionStatus.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: 'Sessão não está em andamento'
      });
    }

    // CORREÇÃO: Finalizar sessão sem argumentos
    try {
      if ((session as any).endSession) {
        await (session as any).endSession();
      } else {
        // Finalização manual se método não existir
        session.status = SessionStatus.COMPLETED;
        (session as any).endTime = new Date();
        
        // Calcular duração se startTime existir
        if ((session as any).startTime) {
          const duration = Math.floor((new Date().getTime() - (session as any).startTime.getTime()) / 1000 / 60);
          (session as any).duration = duration;
        }
      }
      
      // Adicionar resolution e notes se fornecidos
      if (resolution) {
        (session as any).resolution = resolution;
      }
      
      if (notes) {
        (session as any).notes = notes;
      }
      
      await session.save();
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      // Fallback: finalização manual
      session.status = SessionStatus.COMPLETED;
      (session as any).endTime = new Date();
      if (resolution) (session as any).resolution = resolution;
      if (notes) (session as any).notes = notes;
      await session.save();
    }

    res.json({
      success: true,
      message: 'Sessão finalizada com sucesso',
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao finalizar sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Cancelar sessão
// @route   POST /api/sessions/:id/cancel
// @access  Private
export const cancelSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Verificar se o usuário tem acesso à sessão
    const hasAccess = session.clientId.toString() === userId.toString() ||
                     session.technicianId.toString() === userId.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se a sessão pode ser cancelada
    const canBeCancelled = (session as any).canBeCancelled ? (session as any).canBeCancelled() :
                          [SessionStatus.PENDING, SessionStatus.CONFIRMED].includes(session.status);

    if (!canBeCancelled) {
      return res.status(400).json({
        success: false,
        message: 'Sessão não pode ser cancelada'
      });
    }

    session.status = SessionStatus.CANCELLED;
    if (reason) {
      (session as any).notes = reason;
    }

    await session.save();

    res.json({
      success: true,
      message: 'Sessão cancelada com sucesso',
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao cancelar sessão:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Adicionar avaliação à sessão
// @route   POST /api/sessions/:id/rating
// @access  Private (Client)
export const addSessionRating = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const clientId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Avaliação deve ser entre 1 e 5'
      });
    }

    const session = await Session.findById(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Sessão não encontrada'
      });
    }

    // Verificar se é o cliente da sessão
    if (session.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se a sessão foi completada
    if (session.status !== SessionStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Só é possível avaliar sessões completadas'
      });
    }

    // Adicionar avaliação (método personalizado ou manual)
    if ((session as any).addRating) {
      await (session as any).addRating(rating, feedback);
    } else {
      (session as any).clientRating = rating;
      if (feedback) {
        (session as any).clientFeedback = feedback;
      }
      await session.save();
    }

    // Atualizar rating médio do técnico
    const technicianSessions = await Session.find({
      technicianId: session.technicianId,
      status: SessionStatus.COMPLETED,
      clientRating: { $exists: true }
    });

    if (technicianSessions.length > 0) {
      const averageRating = technicianSessions.reduce((sum, s) => sum + ((s as any).clientRating || 0), 0) / technicianSessions.length;

      await User.findByIdAndUpdate(session.technicianId, {
        rating: Math.round(averageRating * 10) / 10
      });
    }

    res.json({
      success: true,
      message: 'Avaliação adicionada com sucesso',
      data: session
    });

  } catch (error: any) {
    console.error('Erro ao adicionar avaliação:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Obter estatísticas do técnico
// @route   GET /api/sessions/technician/stats
// @access  Private (Technician)
export const getTechnicianStats = async (req: AuthRequest, res: Response) => {
  try {
    const technicianId = req.user._id;
    const { startDate, endDate } = req.query;

    let matchQuery: any = {
      technicianId: new mongoose.Types.ObjectId(technicianId),
      status: SessionStatus.COMPLETED
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate as string);
    }

    // CORREÇÃO: Usar agregação MongoDB em vez de método inexistente
    const stats = await Session.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: { $sum: 1 },
          totalEarnings: { $sum: { $ifNull: ['$amount', '$estimatedCost', 0] } },
          averageRating: { $avg: { $ifNull: ['$clientRating', 0] } },
          totalDuration: { $sum: { $ifNull: ['$duration', 0] } }
        }
      }
    ]);

    // Buscar sessões pendentes
    const pendingRequests = await Session.countDocuments({
      technicianId,
      status: SessionStatus.PENDING
    });

    // Buscar sessões ativas
    const activeSessions = await Session.countDocuments({
      technicianId,
      status: SessionStatus.IN_PROGRESS
    });

    const result = {
      totalSessions: stats[0]?.totalSessions || 0,
      completedSessions: stats[0]?.completedSessions || 0,
      totalEarnings: stats[0]?.totalEarnings || 0,
      averageRating: stats[0]?.averageRating || 0,
      totalDuration: stats[0]?.totalDuration || 0,
      pendingRequests,
      activeSessions
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Obter horários disponíveis do técnico
// @route   GET /api/sessions/technician/:id/availability
// @access  Public
export const getTechnicianAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Data é obrigatória'
      });
    }

    // Buscar sessões agendadas para a data
    const scheduledSessions = await Session.find({
      technicianId: id,
      scheduledDate: new Date(date as string),
      status: { $in: [SessionStatus.PENDING, SessionStatus.CONFIRMED] }
    }).select('scheduledTime estimatedDuration');

    // Gerar horários disponíveis (8h às 18h, intervalos de 30min)
    const timeSlots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Verificar se o horário está ocupado
        const isOccupied = scheduledSessions.some(session => {
          const sessionTime = (session as any).scheduledTime;
          const sessionDuration = (session as any).estimatedDuration;
          
          // Converter horário para minutos
          const [sessionHour, sessionMinute] = sessionTime.split(':').map(Number);
          const sessionStartMinutes = sessionHour * 60 + sessionMinute;
          const sessionEndMinutes = sessionStartMinutes + sessionDuration;
          
          const [slotHour, slotMinute] = time.split(':').map(Number);
          const slotMinutes = slotHour * 60 + slotMinute;
          
          return slotMinutes >= sessionStartMinutes && slotMinutes < sessionEndMinutes;
        });

        timeSlots.push({
          time,
          available: !isOccupied
        });
      }
    }

    res.json({
      success: true,
      data: timeSlots
    });

  } catch (error: any) {
    console.error('Erro ao buscar disponibilidade:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};
