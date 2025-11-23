export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  value: number;
  status: "active" | "inactive";
}

export interface Deal {
  id: string;
  title: string;
  customer: string;
  value: number;
  stage: "lead" | "qualified" | "proposal" | "won" | "lost";
  probability: number;
  closeDate: string;
}

export const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@acmecorp.com",
    company: "Acme Corporation",
    phone: "+1 (555) 123-4567",
    value: 125000,
    status: "active"
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "m.chen@techstart.io",
    company: "TechStart Inc",
    phone: "+1 (555) 234-5678",
    value: 85000,
    status: "active"
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@globalventures.com",
    company: "Global Ventures",
    phone: "+1 (555) 345-6789",
    value: 210000,
    status: "active"
  },
  {
    id: "4",
    name: "David Kim",
    email: "d.kim@innovateplus.com",
    company: "InnovatePlus",
    phone: "+1 (555) 456-7890",
    value: 45000,
    status: "inactive"
  },
  {
    id: "5",
    name: "Jessica Martinez",
    email: "jmartinez@futuresystems.com",
    company: "Future Systems",
    phone: "+1 (555) 567-8901",
    value: 175000,
    status: "active"
  }
];

export const mockDeals: Deal[] = [
  {
    id: "1",
    title: "Enterprise Software License",
    customer: "Acme Corporation",
    value: 125000,
    stage: "proposal",
    probability: 75,
    closeDate: "2025-01-15"
  },
  {
    id: "2",
    title: "Cloud Infrastructure Setup",
    customer: "TechStart Inc",
    value: 85000,
    stage: "qualified",
    probability: 60,
    closeDate: "2025-01-30"
  },
  {
    id: "3",
    title: "Annual Support Contract",
    customer: "Global Ventures",
    value: 210000,
    stage: "won",
    probability: 100,
    closeDate: "2024-12-20"
  },
  {
    id: "4",
    title: "Consulting Services",
    customer: "InnovatePlus",
    value: 45000,
    stage: "lead",
    probability: 25,
    closeDate: "2025-02-15"
  },
  {
    id: "5",
    title: "Custom Development Project",
    customer: "Future Systems",
    value: 175000,
    stage: "proposal",
    probability: 70,
    closeDate: "2025-01-25"
  }
];
