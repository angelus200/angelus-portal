import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");

  // Queries
  const { data: users } = trpc.admin.getUsers.useQuery();
  const { data: adminUsers } = trpc.admin.getAdminUsers.useQuery();

  // Mutations
  const promoteToAdmin = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Benutzer zum Admin befördert");
      setEmail("");
      setIsDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message),
  });

  const demoteFromAdmin = trpc.admin.demoteFromAdmin.useMutation({
    onSuccess: () => {
      toast.success("Admin-Rechte entzogen");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handlePromoteToAdmin = () => {
    if (!email) {
      toast.error("E-Mail-Adresse erforderlich");
      return;
    }
    promoteToAdmin.mutate({ email });
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin-Verwaltung</h1>
            <p className="text-muted-foreground mt-1">Verwalten Sie Admin-Rechte und Benutzer</p>
          </div>
        </div>

        {/* Admin-Rechte vergeben */}
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin-Rechte vergeben
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Fördern Sie Benutzer zu Admin-Status
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Neuer Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Admin-Rechte vergeben</DialogTitle>
                  <DialogDescription>
                    Geben Sie die E-Mail-Adresse des Benutzers ein, dem Sie Admin-Rechte gewähren möchten.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>E-Mail-Adresse</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="z.B. benutzer@example.com"
                    />
                  </div>
                  <Button
                    onClick={handlePromoteToAdmin}
                    disabled={promoteToAdmin.isPending}
                    className="w-full"
                  >
                    {promoteToAdmin.isPending ? "Wird befördert..." : "Zum Admin befördern"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Admin-Liste */}
          <div className="space-y-3">
            {adminUsers && adminUsers.length > 0 ? (
              adminUsers.map((admin: any) => (
                <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{admin.name || admin.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Admin</Badge>
                    {admin.email !== "grossdigitalpartner@gmail.com" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => demoteFromAdmin.mutate({ userId: admin.id })}
                        disabled={demoteFromAdmin.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Keine Admin-Benutzer gefunden</p>
            )}
          </div>
        </div>

        {/* Alle Benutzer */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Alle Benutzer</h2>
          <div className="space-y-3">
            {users && users.length > 0 ? (
              users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 font-medium">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name || user.email}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Admin" : "Investor"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">Keine Benutzer gefunden</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
