import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import SpaceStats from './components/SpaceStats';
import SpaceFilters from './components/SpaceFilters';
import BulkActionsBar from './components/BulkActionsBar';
import SpaceTable from './components/SpaceTable';
import SpaceDetailsModal from './components/SpaceDetailsModal';
import CategoryManagement from './components/CategoryManagement';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const SpaceManagement = () => {
  const [spaces, setSpaces] = useState([]);
  const [filteredSpaces, setFilteredSpaces] = useState([]);
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Category management state
  const [categories, setCategories] = useState([
    { id: 'office', name: 'Office Space', label: 'Office Space', subCategories: [
      { id: 'private_office', name: 'Private Office', label: 'Private Office' },
      { id: 'coworking', name: 'Coworking Space', label: 'Coworking Space' }
    ]},
    { id: 'retail', name: 'Retail Space', label: 'Retail Space', subCategories: [
      { id: 'storefront', name: 'Storefront', label: 'Storefront' },
      { id: 'popup_shop', name: 'Pop-up Shop', label: 'Pop-up Shop' }
    ]},
    { id: 'industrial', name: 'Industrial Space', label: 'Industrial Space', subCategories: [
      { id: 'warehouse', name: 'Warehouse', label: 'Warehouse' },
      { id: 'manufacturing', name: 'Manufacturing', label: 'Manufacturing' }
    ]},
    { id: 'hospitality', name: 'Hospitality Space', label: 'Hospitality Space', subCategories: [] },
    { id: 'healthcare', name: 'Healthcare Space', label: 'Healthcare Space', subCategories: [] },
    { id: 'mixed', name: 'Mixed Use Space', label: 'Mixed Use Space', subCategories: [] },
    { id: 'farm', name: 'Farm Space', label: 'Farm Space', subCategories: [] },
    { id: 'creative', name: 'Creative Space', label: 'Creative Space', subCategories: [] },
    { id: 'entertainment', name: 'Entertainment Space', label: 'Entertainment Space', subCategories: [
      { id: 'event_hall', name: 'Event Hall', label: 'Event Hall' },
      { id: 'meeting_room', name: 'Meeting Room', label: 'Meeting Room' }
    ]}
  ]);

  // Mock data
  const mockSpaces = [
    {
      id: 1,
      name: "Modern Conference Room",
      category: "meeting",
      capacity: 12,
      price: 45,
      size: 300,
      status: "pending",
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop"
      ],
      host: {
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        phone: "+1 (555) 123-4567",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        joinedAt: "2023-03-15T10:30:00Z"
      },
      location: {
        address: "123 Business Plaza, Suite 400",
        city: "New York",
        state: "NY",
        zipCode: "10001"
      },
      amenities: ["WiFi", "Projector", "Whiteboard", "Air Conditioning", "Coffee Machine"],
      description: `A modern conference room perfect for business meetings, presentations, and team collaborations. Features state-of-the-art audio-visual equipment, comfortable seating for up to 12 people, and a professional atmosphere that will impress your clients.\n\nThe space includes high-speed internet, a large projector screen, whiteboard, and complimentary coffee service. Located in the heart of Manhattan with easy access to public transportation.`,
      submittedAt: "2025-01-15T14:30:00Z",
      moderationNotes: null
    },
    {
      id: 2,
      name: "Creative Coworking Space",
      category: "coworking",
      capacity: 25,
      price: 35,
      size: 800,
      status: "active",
      images: [
        "https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop"
      ],
      host: {
        name: "Michael Chen",
        email: "michael.chen@email.com",
        phone: "+1 (555) 987-6543",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        joinedAt: "2023-01-20T09:15:00Z"
      },
      location: {
        address: "456 Creative District",
        city: "San Francisco",
        state: "CA",
        zipCode: "94102"
      },
      amenities: ["WiFi", "Kitchen", "Parking", "24/7 Security", "Printing"],
      description: `An inspiring coworking space designed for creative professionals and entrepreneurs. Open floor plan with flexible seating arrangements, dedicated quiet zones, and collaborative areas.\n\nFeatures include high-speed internet, fully equipped kitchen, printing facilities, and 24/7 access. Perfect for freelancers, startups, and remote teams looking for a productive work environment.`,
      submittedAt: "2025-01-10T11:45:00Z",
      moderationNotes: "Approved after minor safety compliance updates"
    },
    {
      id: 3,
      name: "Executive Office Suite",
      category: "office",
      capacity: 8,
      price: 75,
      size: 400,
      status: "suspended",
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop"
      ],
      host: {
        name: "David Rodriguez",
        email: "david.rodriguez@email.com",
        phone: "+1 (555) 456-7890",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        joinedAt: "2022-11-08T16:20:00Z"
      },
      location: {
        address: "789 Executive Tower",
        city: "Chicago",
        state: "IL",
        zipCode: "60601"
      },
      amenities: ["WiFi", "Reception Service", "Parking", "Security"],
      description: `Premium executive office suite with professional reception services and prime downtown location. Ideal for client meetings and executive functions.`,
      submittedAt: "2025-01-08T13:20:00Z",
      moderationNotes: "Suspended due to maintenance issues - pending resolution"
    },
    {
      id: 4,
      name: "Event Hall",
      category: "event",
      capacity: 150,
      price: 200,
      size: 2000,
      status: "active",
      images: [
        "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1519167758481-83f29c1fe8cf?w=800&h=600&fit=crop"
      ],
      host: {
        name: "Emma Wilson",
        email: "emma.wilson@email.com",
        phone: "+1 (555) 234-5678",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        joinedAt: "2023-05-12T14:10:00Z"
      },
      location: {
        address: "321 Event Center Blvd",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90210"
      },
      amenities: ["Sound System", "Lighting", "Catering Kitchen", "Parking", "Security"],
      description: `Spacious event hall perfect for weddings, corporate events, and large gatherings. Professional sound and lighting systems included.`,
      submittedAt: "2025-01-05T10:15:00Z",
      moderationNotes: null
    },
    {
      id: 5,
      name: "Warehouse Storage",
      category: "warehouse",
      capacity: 50,
      price: 25,
      size: 5000,
      status: "rejected",
      images: [
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop"
      ],
      host: {
        name: "Robert Taylor",
        email: "robert.taylor@email.com",
        phone: "+1 (555) 345-6789",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        joinedAt: "2023-08-03T12:30:00Z"
      },
      location: {
        address: "654 Industrial Way",
        city: "Houston",
        state: "TX",
        zipCode: "77001"
      },
      amenities: ["Loading Dock", "Security", "Climate Control"],
      description: `Large warehouse space suitable for storage and light industrial use. Features loading dock and climate control systems.`,
      submittedAt: "2025-01-03T09:45:00Z",
      moderationNotes: "Rejected due to insufficient safety documentation"
    },
    {
      id: 6,
      name: "Retail Pop-up Space",
      category: "retail",
      capacity: 30,
      price: 60,
      size: 600,
      status: "pending",
      images: [
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop"
      ],
      host: {
        name: "Lisa Anderson",
        email: "lisa.anderson@email.com",
        phone: "+1 (555) 567-8901",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        joinedAt: "2023-09-18T11:25:00Z"
      },
      location: {
        address: "987 Shopping District",
        city: "Miami",
        state: "FL",
        zipCode: "33101"
      },
      amenities: ["Display Windows", "Storage", "WiFi", "Security"],
      description: `Prime retail space in busy shopping district, perfect for pop-up stores and product launches. High foot traffic location.`,
      submittedAt: "2025-01-02T15:10:00Z",
      moderationNotes: null
    }
  ];

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    suspended: 0
  });

  useEffect(() => {
    // Initialize with mock data
    setSpaces(mockSpaces);
    setFilteredSpaces(mockSpaces);
    
    // Calculate stats
    const newStats = {
      total: mockSpaces?.length,
      pending: mockSpaces?.filter(s => s?.status === 'pending')?.length,
      active: mockSpaces?.filter(s => s?.status === 'active')?.length,
      suspended: mockSpaces?.filter(s => s?.status === 'suspended')?.length
    };
    setStats(newStats);
  }, []);

  // Filter and sort spaces
  useEffect(() => {
    let filtered = [...spaces];
    
    // Apply sorting
    filtered?.sort((a, b) => {
      const aValue = a?.[sortConfig?.key];
      const bValue = b?.[sortConfig?.key];
      
      if (sortConfig?.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredSpaces(filtered);
  }, [spaces, sortConfig]);

  const handleFiltersChange = (filters) => {
    let filtered = [...spaces];
    
    // Apply search filter
    if (filters?.search) {
      const searchTerm = filters?.search?.toLowerCase();
      filtered = filtered?.filter(space =>
        space?.name?.toLowerCase()?.includes(searchTerm) ||
        space?.host?.name?.toLowerCase()?.includes(searchTerm) ||
        space?.location?.city?.toLowerCase()?.includes(searchTerm)
      );
    }
    
    // Apply category filter
    if (filters?.category) {
      filtered = filtered?.filter(space => space?.category === filters?.category);
    }
    
    // Apply location filter
    if (filters?.location) {
      const locationTerm = filters?.location?.toLowerCase();
      filtered = filtered?.filter(space =>
        space?.location?.city?.toLowerCase()?.includes(locationTerm) ||
        space?.location?.state?.toLowerCase()?.includes(locationTerm)
      );
    }
    
    // Apply status filter
    if (filters?.status) {
      filtered = filtered?.filter(space => space?.status === filters?.status);
    }
    
    // Apply price range filter
    if (filters?.priceRange?.min) {
      filtered = filtered?.filter(space => space?.price >= parseInt(filters?.priceRange?.min));
    }
    if (filters?.priceRange?.max) {
      filtered = filtered?.filter(space => space?.price <= parseInt(filters?.priceRange?.max));
    }
    
    // Apply amenities filter
    if (filters?.amenities?.length > 0) {
      filtered = filtered?.filter(space =>
        filters?.amenities?.every(amenity =>
          space?.amenities?.some(spaceAmenity =>
            spaceAmenity?.toLowerCase()?.includes(amenity?.toLowerCase())
          )
        )
      );
    }
    
    setFilteredSpaces(filtered);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilteredSpaces(spaces);
    setCurrentPage(1);
  };

  const handleSelectSpace = (spaceId, checked) => {
    if (checked) {
      setSelectedSpaces([...selectedSpaces, spaceId]);
    } else {
      setSelectedSpaces(selectedSpaces?.filter(id => id !== spaceId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const currentPageSpaces = getCurrentPageSpaces();
      const currentPageIds = currentPageSpaces?.map(space => space?.id);
      const newSelected = [...new Set([...selectedSpaces, ...currentPageIds])];
      setSelectedSpaces(newSelected);
    } else {
      const currentPageSpaces = getCurrentPageSpaces();
      const currentPageIds = currentPageSpaces?.map(space => space?.id);
      setSelectedSpaces(selectedSpaces?.filter(id => !currentPageIds?.includes(id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedSpaces([]);
  };

  const handleQuickAction = (spaceId, action) => {
    setSpaces(spaces?.map(space => {
      if (space?.id === spaceId) {
        return { ...space, status: action === 'approve' ? 'active' : 'rejected' };
      }
      return space;
    }));
    
    // Update stats
    const updatedSpaces = spaces?.map(space => {
      if (space?.id === spaceId) {
        return { ...space, status: action === 'approve' ? 'active' : 'rejected' };
      }
      return space;
    });
    
    const newStats = {
      total: updatedSpaces?.length,
      pending: updatedSpaces?.filter(s => s?.status === 'pending')?.length,
      active: updatedSpaces?.filter(s => s?.status === 'active')?.length,
      suspended: updatedSpaces?.filter(s => s?.status === 'suspended')?.length
    };
    setStats(newStats);
  };

  const handleBulkAction = (action) => {
    const newStatus = action === 'approve' ? 'active' : 
                     action === 'reject' ? 'rejected' :
                     action === 'suspend' ? 'suspended' :
                     action === 'activate' ? 'active' : null;
    
    if (newStatus) {
      setSpaces(spaces?.map(space => {
        if (selectedSpaces?.includes(space?.id)) {
          return { ...space, status: newStatus };
        }
        return space;
      }));
      
      // Update stats
      const updatedSpaces = spaces?.map(space => {
        if (selectedSpaces?.includes(space?.id)) {
          return { ...space, status: newStatus };
        }
        return space;
      });
      
      const newStats = {
        total: updatedSpaces?.length,
        pending: updatedSpaces?.filter(s => s?.status === 'pending')?.length,
        active: updatedSpaces?.filter(s => s?.status === 'active')?.length,
        suspended: updatedSpaces?.filter(s => s?.status === 'suspended')?.length
      };
      setStats(newStats);
    }
    
    setSelectedSpaces([]);
  };

  const handleViewDetails = (space) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
  };

  const handleApprove = (spaceId, note) => {
    setSpaces(spaces?.map(space => {
      if (space?.id === spaceId) {
        return { ...space, status: 'active', moderationNotes: note };
      }
      return space;
    }));
    
    // Update stats
    const newStats = { ...stats };
    newStats.pending -= 1;
    newStats.active += 1;
    setStats(newStats);
  };

  const handleReject = (spaceId, note) => {
    setSpaces(spaces?.map(space => {
      if (space?.id === spaceId) {
        return { ...space, status: 'rejected', moderationNotes: note };
      }
      return space;
    }));
    
    // Update stats
    const newStats = { ...stats };
    newStats.pending -= 1;
    setStats(newStats);
  };

  const handleSuspend = (spaceId, note) => {
    setSpaces(spaces?.map(space => {
      if (space?.id === spaceId) {
        return { ...space, status: 'suspended', moderationNotes: note };
      }
      return space;
    }));
    
    // Update stats
    const newStats = { ...stats };
    if (spaces?.find(s => s?.id === spaceId)?.status === 'active') {
      newStats.active -= 1;
    }
    newStats.suspended += 1;
    setStats(newStats);
  };

  const handleSort = (sortConfig) => {
    setSortConfig(sortConfig);
  };

  const handleCategoriesUpdate = (updatedCategories) => {
    setCategories(updatedCategories);
  };

  // Pagination
  const getCurrentPageSpaces = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSpaces?.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredSpaces?.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">Space Management</h1>
          </div>
          <UserProfileDropdown />
        </header>

        {/* Main Content */}
        <main className="p-6">
          <BreadcrumbNavigation />
          
          {/* Stats */}
          <SpaceStats stats={stats} />
          
          {/* Category Management */}
          <CategoryManagement 
            categories={categories}
            onCategoriesUpdate={handleCategoriesUpdate}
          />
          
          {/* Filters */}
          <SpaceFilters 
            categories={categories}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
          
          {/* Bulk Actions */}
          <BulkActionsBar
            selectedCount={selectedSpaces?.length}
            onBulkAction={handleBulkAction}
            onClearSelection={handleClearSelection}
          />
          
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-muted-foreground">
                Showing {getCurrentPageSpaces()?.length} of {filteredSpaces?.length} spaces
              </p>
              {stats?.pending > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-warning/10 text-warning rounded-full">
                  <Icon name="AlertCircle" size={16} />
                  <span className="text-sm font-medium">{stats?.pending} pending approval</span>
                </div>
              )}
            </div>
            
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
            >
              Export
            </Button>
          </div>
          
          {/* Table */}
          <SpaceTable
            spaces={getCurrentPageSpaces()}
            selectedSpaces={selectedSpaces}
            onSelectSpace={handleSelectSpace}
            onSelectAll={handleSelectAll}
            onQuickAction={handleQuickAction}
            onViewDetails={handleViewDetails}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  iconName="ChevronLeft"
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  iconName="ChevronRight"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Space Details Modal */}
      <SpaceDetailsModal
        space={selectedSpace}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSpace(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={handleSuspend}
      />
    </div>
  );
};

export default SpaceManagement;