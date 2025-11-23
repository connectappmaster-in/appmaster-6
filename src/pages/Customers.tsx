import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockCustomers } from "@/lib/mockData";
import { Search, Mail, Phone, Building2 } from "lucide-react";

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = mockCustomers.filter(
    customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your customer relationships</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{customer.name}</h3>
                        <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                          {customer.status}
                        </Badge>
                      </div>
                      
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{customer.company}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{customer.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Customer Value</p>
                      <p className="text-2xl font-bold text-primary">
                        ${(customer.value / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No customers found matching your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
