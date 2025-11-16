# 🍌 1000 Bananas 2.0

A comprehensive **SaaS platform for Amazon Sellers** to manage products, track workflows, and sync with Amazon Selling Partner API.

## 🚀 Features

### Product Management
- **Selection Module**: Product research and selection pipeline
- **Development Module**: Track product development stages
- **Catalog Module**: Complete product catalog with detailed information
- **Bulk Upload**: Import products from CSV with comprehensive field mapping

### Team Workspaces
- **Dashboard**: Team overview and analytics
- **Formula**: Formula management and tracking
- **Design**: Design workflow and asset management
- **Listing**: Listing optimization workflow
- **Ads**: Advertising campaign tracking

### Amazon Integration
- **SP-API Sync**: Direct integration with Amazon Selling Partner API
- **Product Import**: Sync products, ASINs, SKUs, inventory, and images
- **Reports API**: Comprehensive product data fetching

### Customization
- **Product Templates**: Define default product configurations
- **Custom Status Workflow**: Configure your own status pipeline
- **Custom Fields**: Add custom data fields to products
- **Workspace Modules**: Enable/disable and rename workspace sections
- **Product Modules**: Customize product management sections

### Advanced Features
- **Multi-variation Products**: Support for size, color, and custom variations
- **Dark Theme**: Full dark mode support
- **Responsive Design**: Works on all screen sizes
- **Real-time Validation**: Instant feedback on data entry
- **Bulk Operations**: Import/export via CSV

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Backend Setup (For Amazon SP-API)

```bash
# Install backend dependencies
npm install express cors axios dotenv --save

# Or use the provided installer
install-backend.bat

# Start the backend server
npm run server

# Or run both frontend and backend together
npm run dev
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Amazon SP-API Credentials
SP_API_CLIENT_ID=your_client_id_here
SP_API_CLIENT_SECRET=your_client_secret_here
SP_API_REFRESH_TOKEN=your_refresh_token_here
```

## 🏗️ Project Structure

```
1000bananas/
├── public/              # Static assets
│   └── assets/          # Images and icons
├── src/
│   ├── components/      # Reusable components
│   ├── context/         # React Context (State Management)
│   ├── pages/           # Page components
│   │   ├── products/    # Product modules
│   │   ├── team/        # Team workspace modules
│   │   └── supply-chain/# Supply chain modules
│   ├── services/        # API services
│   └── utils/           # Utility functions
├── server-spapi.js      # Backend server for Amazon SP-API
└── tailwind.config.js   # Tailwind CSS configuration
```

## 🎯 Key Technologies

- **Frontend**: React, React Router, Tailwind CSS
- **State Management**: React Context API
- **Tables**: TanStack Table (React Table v8)
- **Notifications**: Sonner
- **Backend**: Node.js, Express
- **API**: Amazon Selling Partner API (SP-API)
- **Storage**: localStorage (frontend-only, no database required)

## 📱 Usage

### Initial Setup
1. Open the app at `http://localhost:3000`
2. Complete the onboarding setup
3. Configure your company information
4. Add brands and sales accounts

### Import Products
1. Go to **Settings** > **Amazon SP-API**
2. Start the backend server: `npm run server`
3. Click "Sync Products from Amazon"
4. Or use **Bulk Upload** to import from CSV

### Customize Workflow
1. Go to **Settings**
2. Configure:
   - **Product Templates**: Define variations and tabs
   - **Status Workflow**: Create custom statuses
   - **Custom Fields**: Add data fields
   - **Workspace Modules**: Customize team sections

### Manage Products
1. **Selection**: Research and select products
2. **Development**: Track development pipeline
3. **Catalog**: View complete product details
4. Click any product to view/edit full information

## 🔑 Key Features Explained

### 1000 Bananas Database Import
The app can import comprehensive product data from CSV files with 90+ columns including:
- Product info, ASINs, SKUs, UPCs
- Packaging, Formula, Dimensions
- Images (6-sided, slides, A+)
- Label copy, Marketing data
- Vine program information
- And much more...

### Variation Support
Products can have multiple variations (e.g., 8oz, Quart, Gallon) with variation-specific:
- ASINs and SKUs
- Pricing and inventory
- Dimensions and weight
- Listing content

### Product Templates
Define reusable templates with:
- Default variations
- Visible tabs
- Field configurations
- Apply to new products automatically

## 🤝 Contributing

This is a private project for 1000 Bananas. For issues or feature requests, contact the development team.

## 📄 License

Proprietary - © 2025 1000 Bananas

## 🆘 Support

For support, email: [your-email@1000bananas.com]

---

**Built with 🍌 for Amazon Sellers**


