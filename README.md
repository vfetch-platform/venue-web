# VFetch Venue Web Application

A Progressive Web App (PWA) for venue staff to manage lost and found items.

## Features

- **Items Management** (venueFirst.html equivalent)
  - List and search lost items
  - Filter by category and status
  - View item statistics
  - Real-time updates

- **Add New Items** (venuefourth.html equivalent)
  - Create new found item entries
  - Upload multiple photos
  - Add detailed descriptions and metadata
  - Tag system for better searchability

- **Claims Management** (venuesecond.html equivalent)
  - Review and approve/reject claims
  - View claimant information
  - Manage pickup codes
  - Track claim status

- **Venue Profile** (venuethird.html equivalent)
  - Update venue information
  - Manage contact details
  - View venue statistics
  - Staff management

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Heroicons
- **PWA**: next-pwa with service worker
- **TypeScript**: Full type safety

## API Integration

The application integrates with the existing backend APIs:

### Available Endpoints
- `GET /api/items/venue/:venueId` - Fetch venue items
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `GET /api/claims/venue/:venueId` - Get venue claims
- `PATCH /api/claims/:id/status` - Update claim status
- `GET /api/venues/:id` - Get venue details
- `PUT /api/venues/:id` - Update venue

### TODO: Missing Endpoints
- File upload endpoints for item images
- Real-time notifications
- Advanced search with filters
- Analytics and reporting endpoints

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## PWA Features

- Offline support with service worker
- App manifest for installation
- Push notifications (planned)
- Background sync (planned)

## Authentication

Currently uses mock authentication. Integration with actual auth service is marked with TODO comments throughout the codebase.

## File Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── claims/         # Claims management
│   ├── items/          # Items list and add new
│   ├── login/          # Authentication
│   └── profile/        # Venue profile
├── components/         # Reusable components
├── lib/               # API client and utilities
├── store/             # State management
├── types/             # TypeScript definitions
└── utils/             # Helper functions
```