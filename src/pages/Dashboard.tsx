import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockCustomers, mockDeals } from "@/lib/mockData";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const totalCustomers = mockCustomers.length;
  const activeCustomers = mockCustomers.filter(c => c.status === "active").length;
  const totalRevenue = mockDeals.filter(d => d.stage === "won").reduce((sum, d) => sum + d.value, 0);
  const pipelineValue = mockDeals.filter(d => d.stage !== "won" && d.stage !== "lost").reduce((sum, d) => sum + d.value, 0);

  const stats = [
    {
      title: "Total Revenue",
      value: `$${(totalRevenue / 1000).toFixed(0)}K`,
      icon: DollarSign,
      description: "Closed deals this quarter",
      color: "text-success"
    },
    {
      title: "Active Customers",
      value: activeCustomers,
      icon: Users,
      description: `${totalCustomers} total customers`,
      color: "text-primary"
    },
    {
      title: "Open Deals",
      value: mockDeals.filter(d => d.stage !== "won" && d.stage !== "lost").length,
      icon: Briefcase,
      description: "In pipeline",
      color: "text-warning"
    },
    {
      title: "Pipeline Value",
      value: `$${(pipelineValue / 1000).toFixed(0)}K`,
      icon: TrendingUp,
      description: "Potential revenue",
      color: "text-accent"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCustomers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(customer.value / 1000).toFixed(0)}K</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      customer.status === "active" 
                        ? "bg-success/10 text-success" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {customer.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDeals.filter(d => d.stage !== "won" && d.stage !== "lost").slice(0, 5).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-muted-foreground">{deal.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(deal.value / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">{deal.probability}% prob.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
