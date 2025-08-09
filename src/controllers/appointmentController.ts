import { Request, Response } from 'express';
import Appointment, { AppointmentStatus, AppointmentType, PaymentStatus } from '../models/appointmentModel';
import User from '../models/userModel';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Criar novo agendamento
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      helperId,
      title,
      description,
      type,
      specialty,
      scheduledDate,
      scheduledTime,
      duration,
      issue,
      requirements
    } = req.body;

    // Validar dados obrigatórios
    if (!helperId || !title || !description || !type || !scheduledDate || !scheduledTime || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Todos os campos obrigatórios devem ser preenchidos'
      });
    }

    // Verificar se o helper existe e está disponível
    const helper = await User.findById(helperId);
    if (!helper || !helper.isActive || !helper.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado ou não disponível'
      });
    }

    // Verificar se o cliente tem créditos suficientes
    const client = await User.findById(req.user._id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    // Calcular custo
    const hourlyRate = helper.hourlyRate || 80;
    const totalCost = (duration / 60) * hourlyRate;
    const creditsNeeded = Math.ceil(totalCost / 10); // 1 crédito = R$ 10

    if (client.credits < creditsNeeded) {
      return res.status(400).json({
        success: false,
        message: `Créditos insuficientes. Necessário: ${creditsNeeded}, Disponível: ${client.credits}`
      });
    }

    // Verificar conflito de horário
    const scheduledDateTime = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(scheduledDateTime.getTime() + duration * 60 * 1000);

    const conflictingAppointment = await Appointment.findOne({
      helperId,
      status: { $in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
      $or: [
        {
          $and: [
            { scheduledDate: { $lte: scheduledDateTime } },
            { 
              $expr: {
                $gte: [
                  { $add: ['$scheduledDate', { $multiply: ['$duration', 60000] }] },
                  scheduledDateTime
                ]
              }
            }
          ]
        },
        {
          $and: [
            { scheduledDate: { $gte: scheduledDateTime } },
            { scheduledDate: { $lt: endDateTime } }
          ]
        }
      ]
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Horário não disponível'
      });
    }

    // Criar agendamento
    const appointment = new Appointment({
      clientId: req.user._id,
      helperId,
      title,
      description,
      type,
      specialty,
      scheduledDate,
      scheduledTime,
      duration,
      hourlyRate,
      totalCost,
      creditsUsed: creditsNeeded,
      issue,
      requirements,
      status: AppointmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING
    });

    await appointment.save();

    // Popular dados para resposta
    await appointment.populate('helperId', 'name email specialties rating profileImage');
    await appointment.populate('clientId', 'name email profileImage');

    res.status(201).json({
      success: true,
      message: 'Agendamento criado com sucesso',
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Listar agendamentos do usuário
// @route   GET /api/appointments
// @access  Private
export const getUserAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = 1, limit = 10, type } = req.query;
    const userId = req.user._id;

    // Construir query - usuário pode ser cliente ou helper
    const query: any = {
      $or: [
        { clientId: userId },
        { helperId: userId }
      ]
    };

    // Filtros opcionais
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    // Paginação
    const skip = (Number(page) - 1) * Number(limit);

    // Buscar agendamentos
    const appointments = await Appointment.find(query)
      .populate('clientId', 'name email profileImage')
      .populate('helperId', 'name email profileImage specialties rating')
      .sort({ scheduledDate: -1, scheduledTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Contar total
    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      data: {
        appointments,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Obter detalhes de um agendamento
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id)
      .populate('clientId', 'name email profileImage phone')
      .populate('helperId', 'name email profileImage specialties rating phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar se o usuário tem acesso ao agendamento
    const hasAccess = appointment.clientId._id.toString() === userId.toString() ||
                     appointment.helperId._id.toString() === userId.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    res.json({
      success: true,
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Responder a solicitação de agendamento (Helper)
// @route   POST /api/appointments/:id/respond
// @access  Private (Helper)
export const respondToAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, message } = req.body; // action: 'accept' | 'reject'
    const helperId = req.user._id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Ação inválida'
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar se é o helper do agendamento
    if (appointment.helperId.toString() !== helperId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se pode ser modificado
    if (appointment.status !== AppointmentStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Agendamento não pode ser modificado'
      });
    }

    if (action === 'accept') {
      // Aceitar agendamento - debitar créditos do cliente
      const client = await User.findById(appointment.clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      if (client.credits < appointment.creditsUsed) {
        return res.status(400).json({
          success: false,
          message: 'Cliente não possui créditos suficientes'
        });
      }

      // Debitar créditos
      client.credits -= appointment.creditsUsed;
      await client.save();

      appointment.status = AppointmentStatus.CONFIRMED;
      appointment.paymentStatus = PaymentStatus.PAID;
    } else {
      appointment.status = AppointmentStatus.REJECTED;
    }

    if (message) {
      appointment.notes = message;
    }

    await appointment.save();

    // Popular dados para resposta
    await appointment.populate('clientId', 'name email');

    res.json({
      success: true,
      message: `Agendamento ${action === 'accept' ? 'aceito' : 'rejeitado'} com sucesso`,
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao responder agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Iniciar agendamento
// @route   POST /api/appointments/:id/start
// @access  Private (Helper)
export const startAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const helperId = req.user._id;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar se é o helper do agendamento
    if (appointment.helperId.toString() !== helperId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se pode ser iniciado
    if (!appointment.canBeStarted()) {
      return res.status(400).json({
        success: false,
        message: 'Agendamento não pode ser iniciado ainda'
      });
    }

    appointment.status = AppointmentStatus.IN_PROGRESS;
    appointment.startedAt = new Date();
    await appointment.save();

    res.json({
      success: true,
      message: 'Agendamento iniciado com sucesso',
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao iniciar agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Finalizar agendamento
// @route   POST /api/appointments/:id/complete
// @access  Private (Helper)
export const completeAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;
    const helperId = req.user._id;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar se é o helper do agendamento
    if (appointment.helperId.toString() !== helperId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se está em andamento
    if (appointment.status !== AppointmentStatus.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        message: 'Agendamento não está em andamento'
      });
    }

    appointment.status = AppointmentStatus.COMPLETED;
    appointment.completedAt = new Date();
    
    if (resolution) {
      appointment.resolution = resolution;
    }
    
    if (notes) {
      appointment.notes = notes;
    }

    await appointment.save();

    // Atualizar estatísticas do helper
    const helper = await User.findById(helperId);
    if (helper) {
      helper.totalSessions = (helper.totalSessions || 0) + 1;
      await helper.save();
    }

    res.json({
      success: true,
      message: 'Agendamento finalizado com sucesso',
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao finalizar agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Cancelar agendamento
// @route   POST /api/appointments/:id/cancel
// @access  Private
export const cancelAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar se o usuário tem acesso
    const hasAccess = appointment.clientId.toString() === userId.toString() ||
                     appointment.helperId.toString() === userId.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Verificar se pode ser cancelado
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Agendamento não pode ser cancelado (menos de 2 horas antes do horário)'
      });
    }

    // Se foi confirmado, devolver créditos ao cliente
    if (appointment.status === AppointmentStatus.CONFIRMED && appointment.paymentStatus === PaymentStatus.PAID) {
      const client = await User.findById(appointment.clientId);
      if (client) {
        client.credits += appointment.creditsUsed;
        await client.save();
      }
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.paymentStatus = PaymentStatus.REFUNDED;
    
    if (reason) {
      appointment.notes = reason;
    }

    await appointment.save();

    res.json({
      success: true,
      message: 'Agendamento cancelado com sucesso',
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

// @desc    Avaliar agendamento
// @route   POST /api/appointments/:id/rate
// @access  Private
export const rateAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Avaliação deve ser entre 1 e 5'
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Agendamento não encontrado'
      });
    }

    // Verificar se o agendamento foi completado
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Só é possível avaliar agendamentos completados'
      });
    }

    // Verificar quem está avaliando
    const isClient = appointment.clientId.toString() === userId.toString();
    const isHelper = appointment.helperId.toString() === userId.toString();

    if (!isClient && !isHelper) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado'
      });
    }

    // Adicionar avaliação
    if (isClient) {
      appointment.clientRating = rating;
      if (feedback) {
        appointment.clientFeedback = feedback;
      }
    } else {
      appointment.helperRating = rating;
      if (feedback) {
        appointment.helperFeedback = feedback;
      }
    }

    await appointment.save();

    // Atualizar rating médio do helper (se cliente avaliou)
    if (isClient) {
      const helperAppointments = await Appointment.find({
        helperId: appointment.helperId,
        status: AppointmentStatus.COMPLETED,
        clientRating: { $exists: true }
      });

      if (helperAppointments.length > 0) {
        const averageRating = helperAppointments.reduce((sum, app) => sum + (app.clientRating || 0), 0) / helperAppointments.length;

        await User.findByIdAndUpdate(appointment.helperId, {
          rating: Math.round(averageRating * 10) / 10
        });
      }
    }

    res.json({
      success: true,
      message: 'Avaliação adicionada com sucesso',
      data: appointment
    });

  } catch (error: any) {
    console.error('Erro ao avaliar agendamento:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno do servidor'
    });
  }
};

