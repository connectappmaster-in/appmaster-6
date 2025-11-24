import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Ticket, AlertTriangle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateProblemDialog } from "@/components/helpdesk/CreateProblemDialog";
import { TicketFilters } from "@/components/helpdesk/TicketFilters";
import { BulkActionsToolbar } from "@/components/helpdesk/BulkActionsToolbar";
import { TicketTableView } from "@/components/helpdesk/TicketTableView";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export default function TicketsModule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tickets");
  const [createProblemOpen, setCreateProblemOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const {
    data: allTickets,
    isLoading
  } = useQuery({
    queryKey: ['helpdesk-tickets-all'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('helpdesk_tickets').select('*, category:helpdesk_categories(name), assignee:users!helpdesk_tickets_assignee_id_fkey(name)').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    }
  });

  // Client-side filtering
  const tickets = (allTickets || []).filter((ticket: any) => {
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.category && ticket.category_id?.toString() !== filters.category) return false;
    if (filters.assignee === 'unassigned' && ticket.assignee_id) return false;
    if (filters.assignee && filters.assignee !== 'unassigned' && ticket.assignee_id !== filters.assignee) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = ticket.title?.toLowerCase().includes(search) || ticket.description?.toLowerCase().includes(search) || ticket.ticket_number?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    if (filters.dateFrom && new Date(ticket.created_at) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(ticket.created_at) > new Date(filters.dateTo)) return false;
    return true;
  });
  const {
    data: allProblems
  } = useQuery({
    queryKey: ['helpdesk-problems'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('helpdesk_problems').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    }
  });
  const problems = allProblems || [];
  const handleSelectTicket = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? tickets.map((t: any) => t.id) : []);
  };
  const quickLinks: any[] = [];
  return <div className="min-h-screen bg-background">
      <div className="w-full px-4 pt-2 pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
          {/* Compact Single Row Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <TabsList className="h-8">
              <TabsTrigger value="tickets" className="gap-1.5 px-3 text-sm h-7">
                <Ticket className="h-3.5 w-3.5" />
                All Tickets
                {tickets.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                    {tickets.length}
                  </Badge>}
              </TabsTrigger>
              <TabsTrigger value="problems" className="gap-1.5 px-3 text-sm h-7">
                <AlertTriangle className="h-3.5 w-3.5" />
                Problems
                {problems.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                    {problems.length}
                  </Badge>}
              </TabsTrigger>
            </TabsList>

            {activeTab === 'tickets' && (
              <>
                <div className="relative w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9 h-8"
                  />
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? null : value })}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, priority: value === 'all' ? null : value })}
                  >
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button size="sm" onClick={() => navigate('/helpdesk/new')} className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-sm">New Ticket</span>
                  </Button>
                </div>
              </>
            )}

            {activeTab === 'problems' && (
              <Button variant="outline" size="sm" onClick={() => setCreateProblemOpen(true)} className="gap-1.5 h-8 ml-auto">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm">New Problem</span>
              </Button>
            )}
          </div>

          <TabsContent value="tickets" className="space-y-2 mt-2">

            {/* Bulk Actions */}
            {selectedIds.length > 0 && <BulkActionsToolbar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} />}

            {/* Tickets Content */}
            {isLoading ? <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading tickets...</p>
                </div>
              </div> : tickets.length === 0 ? <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <Ticket className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1">No tickets found</h3>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
                  {Object.keys(filters).length > 0 ? "Try adjusting your filters to see more tickets" : "Get started by creating your first support ticket"}
                </p>
                {Object.keys(filters).length === 0 && <Button onClick={() => navigate('/helpdesk/new')} size="sm" className="gap-1.5 h-8">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-sm">Create First Ticket</span>
                  </Button>}
              </div> : <TicketTableView tickets={tickets} selectedIds={selectedIds} onSelectTicket={handleSelectTicket} onSelectAll={handleSelectAll} />}
          </TabsContent>

          <TabsContent value="problems" className="space-y-2">
            {problems.length === 0 ? <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
                <div className="rounded-full bg-muted p-4 mb-3">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1">No problems found</h3>
                <p className="text-xs text-muted-foreground mb-4 text-center max-w-md">
                  Create a problem record to track recurring issues and document solutions
                </p>
                <Button onClick={() => setCreateProblemOpen(true)} size="sm" className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-sm">Create First Problem</span>
                </Button>
              </div> : <div className="space-y-1.5">
                {problems.map((problem: any) => <div key={problem.id} className="hover:bg-accent/50 transition-colors cursor-pointer p-3 rounded-md border" onClick={() => navigate(`/helpdesk/problems/${problem.id}`)}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">
                        {problem.problem_number}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {problem.status}
                      </Badge>
                      <Badge className={`text-[10px] h-5 px-1.5 ${problem.priority === 'urgent' ? 'bg-red-500 hover:bg-red-600' : problem.priority === 'high' ? 'bg-orange-500 hover:bg-orange-600' : problem.priority === 'medium' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}>
                        {problem.priority}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-medium mb-0.5">{problem.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                      {problem.description}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>Created {new Date(problem.created_at).toLocaleDateString()}</span>
                      {problem.linked_ticket_ids && problem.linked_ticket_ids.length > 0 && <span>• {problem.linked_ticket_ids.length} linked tickets</span>}
                    </div>
                  </div>)}
              </div>}
          </TabsContent>
        </Tabs>

        <CreateProblemDialog open={createProblemOpen} onOpenChange={setCreateProblemOpen} />
      </div>
    </div>;
}