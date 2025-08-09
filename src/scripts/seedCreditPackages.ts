import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CreditPackage from '../models/creditPackageModel';

dotenv.config();

const creditPackages = [
  {
    name: 'Pacote Básico',
    description: 'Ideal para uso ocasional',
    credits: 10,
    price: 89.90,
    discount: 0,
    isPopular: false,
    features: [
      '10 créditos',
      'Suporte básico',
      'Validade de 90 dias'
    ],
    validityDays: 90
  },
  {
    name: 'Pacote Popular',
    description: 'Melhor custo-benefício',
    credits: 25,
    price: 199.90,
    discount: 10,
    isPopular: true,
    features: [
      '25 créditos',
      'Suporte prioritário',
      'Validade de 120 dias',
      '10% de desconto'
    ],
    validityDays: 120
  },
  {
    name: 'Pacote Premium',
    description: 'Para uso intensivo',
    credits: 50,
    price: 349.90,
    discount: 20,
    isPopular: false,
    features: [
      '50 créditos',
      'Suporte VIP',
      'Validade de 180 dias',
      '20% de desconto',
      'Acesso a recursos exclusivos'
    ],
    validityDays: 180
  },
  {
    name: 'Pacote Empresarial',
    description: 'Para empresas e equipes',
    credits: 100,
    price: 599.90,
    discount: 30,
    isPopular: false,
    features: [
      '100 créditos',
      'Suporte dedicado',
      'Validade de 365 dias',
      '30% de desconto',
      'Relatórios detalhados',
      'Gestão de equipe'
    ],
    validityDays: 365
  }
];

async function seedCreditPackages() {
  try {
    // Conectar ao MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supravel';
    await mongoose.connect(mongoURI);
    console.log('Conectado ao MongoDB');

    // Limpar pacotes existentes
    await CreditPackage.deleteMany({});
    console.log('Pacotes existentes removidos');

    // Inserir novos pacotes
    const packages = await CreditPackage.insertMany(creditPackages);
    console.log(`${packages.length} pacotes de créditos criados com sucesso`);

    // Exibir pacotes criados
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: ${pkg.credits} créditos por R$ ${pkg.price}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Erro ao popular pacotes de créditos:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedCreditPackages();
}

export default seedCreditPackages;

