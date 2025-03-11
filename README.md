# HWG Analytics Hub

A comprehensive analytics and management dashboard for service agreements and claims data. This application enables administrators to visualize, analyze, and track key performance indicators (KPIs) related to agreements, claims, and dealer performance.

## Features

- **Interactive Dashboards** - Visualize critical metrics with real-time filtering
- **Agreement Analytics** - Track active, pending, and cancelled agreements
- **Claims Management** - Monitor claims status, payment information, and processing times
- **Dealer Performance** - Compare dealer performance with advanced leaderboards
- **Advanced Filtering** - Filter by date range, dealer, and status across all views

## Technical Overview

### Tech Stack

- **Frontend:** React with TypeScript
- **Build Tool:** Vite
- **Backend:** Supabase (PostgreSQL)
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **State Management:** 
  - React Query for server state
  - React Context for shared state
- **Data Visualization:** Recharts

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Access to Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd claim-analytics-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Development

Start the development server:
```bash
npm run dev
# or
yarn dev
```

### Building for Production

```bash
npm run build
# or
yarn build
```

## Data Architecture

The application works with several core data entities:

- **Agreements** - Service contracts with dealers
- **Claims** - Customer claims against agreements
- **Subclaims** - Individual components of a claim
- **Dealers** - Businesses that sell service agreements

### Key Data Relationships

- **Agreements** are linked to **Dealers** via `DealerUUID`
- **Claims** are linked to **Agreements** via `AgreementID`
- **Subclaims** are linked to **Claims** via `ClaimID`

## Core Features

### Dashboard

The main dashboard displays:

- Summary KPIs for agreements and claims
- Alerts and action items based on data thresholds
- Leaderboard highlights showing top dealers
- Quick access to other sections of the application

### Claims Dashboard

- Claims KPIs (open, pending, closed)
- Filterable table of claims
- Status distribution visualization
- Date range filtering

### Performance Metrics

- Historical performance data with interactive charts
- Time period selection (week, month, 6 months, year)
- Trend analysis by agreement status
- Comparative metrics

### Leaderboard

- Top-performing dealers by revenue and contracts
- Performance metrics and rankings
- Visual charts for revenue and contract comparison

## Best Practices

### Date Filtering Guidelines

- **Claims**: Always use `LastModified` for date filtering
- **Agreements**: Always use `EffectiveDate` for date filtering

### Dealer Filtering

- Filter by `agreements.DealerUUID` consistently across all components

### Claim Status Logic

Use standardized function for claim status:
```js
function getClaimStatus(claim) {
  if (claim.Closed) return 'CLOSED';
  if (!claim.ReportedDate && !claim.Closed) return 'PENDING';
  return 'OPEN';
}
```

## Deployment

The application is deployed on DigitalOcean App Platform with an Express server:

```javascript
// server.js serves the built application
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Set timezone to CST (America/Chicago)
process.env.TZ = 'America/Chicago';

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any route that doesn't match a static file, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Extending the Application

### Adding New Features

To add new features:

1. Create new components in the appropriate directories
2. Add data hooks in the hooks directory
3. Update routes in App.tsx
4. Update sidebar navigation in Sidebar.tsx

### Adding New Charts

1. Create a new component in the charts directory
2. Implement with Recharts components
3. Apply consistent styling
4. Add data processing as needed

## Troubleshooting

### Common Issues

#### Authentication Problems
- Check browser console for errors
- Verify Supabase configuration in client.ts
- Check if user exists in Supabase auth

#### Data Loading Issues
- Check network requests in browser dev tools
- Verify query keys in React Query hooks
- Check date range filters are properly formatted
- Verify dealer filter is correctly applied

#### SQL Function Timeouts
- Use optimized approach with CTEs
- Verify SQL functions are properly installed in Supabase
- Break up large date ranges into smaller chunks

## Contributing

1. Ensure consistent filtering across all components
2. Follow TypeScript patterns
3. Maintain responsive design principles
4. Add detailed logging for debugging
5. Test across different screen sizes and data volumes