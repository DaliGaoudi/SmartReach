# Smart Reach 🚀

A powerful email outreach automation platform built with Next.js, Supabase, and Google AI. Smart Reach helps you create personalized emails, manage contacts, and automate your outreach process with AI-powered content generation.

## ✨ Features

- **AI-Powered Email Generation**: Create personalized emails using Google's Generative AI
- **Contact Management**: Upload and manage your contact lists with CSV support
- **Gmail Integration**: Send emails directly through Gmail with OAuth authentication
- **Email Templates**: Generate and preview email content before sending
- **User Authentication**: Secure login and signup with Supabase Auth
- **Payment Processing**: Integrated Stripe payment system
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Google Generative AI
- **Email**: Gmail API with OAuth
- **Payments**: Stripe
- **Deployment**: Vercel-ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account
- Google Cloud Platform account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-reach.git
   cd smart-reach
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables (see [Environment Setup](#environment-setup) below)

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_WEBHOOK_SECRET_LIVE=your_stripe_webhook_secret_live

# Google Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri
GOOGLE_API_KEY=your_google_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Setting up services:

1. **Supabase Setup**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database migrations in `src/lib/supabase/migrations/`
   - Copy your project URL and anon key

2. **Google Cloud Setup**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Gmail API and Google AI API
   - Create OAuth 2.0 credentials
   - Set up authorized redirect URIs

3. **Stripe Setup**
   - Create an account at [stripe.com](https://stripe.com)
   - Get your API keys from the dashboard
   - Set up webhook endpoints

## 📁 Project Structure

```
smart-reach/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Main dashboard
│   │   └── ...
│   ├── components/            # Reusable components
│   ├── lib/                   # Utility libraries
│   │   ├── supabase/         # Database configuration
│   │   ├── stripe/           # Payment configuration
│   │   └── ...
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
└── ...
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

```bash
npm run build
npm start
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

Please report security issues to [security@smartreach.com](mailto:security@smartreach.com) or see our [Security Policy](SECURITY.md).

## 🆘 Support

- 📧 Email: support@smartreach.com
- 📖 Documentation: [docs.smartreach.com](https://docs.smartreach.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/smart-reach/issues)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) for the amazing framework
- [Supabase](https://supabase.com) for the backend infrastructure
- [Google AI](https://ai.google.dev) for AI capabilities
- [Stripe](https://stripe.com) for payment processing
- [Tailwind CSS](https://tailwindcss.com) for styling

## 📊 Status

![GitHub stars](https://img.shields.io/github/stars/yourusername/smart-reach)
![GitHub forks](https://img.shields.io/github/forks/yourusername/smart-reach)
![GitHub issues](https://img.shields.io/github/issues/yourusername/smart-reach)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/smart-reach)
![GitHub license](https://img.shields.io/github/license/yourusername/smart-reach)

---

Made with ❤️ by the Smart Reach team
