import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { Loader2, Shield, Trash2, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

function AdminManagementContent() {
  const [emailInput, setEmailInput] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  
  const showToast = (title: string, description: string, variant?: string) => {
    // Simple toast fallback - in production, use a toast library
    alert(`${title}: ${description}`);
  };

  // Fetch all users
  const { data: allUsers, isLoading: isLoadingUsers, refetch: refetchUsers } = trpc.admin.getUsers.useQuery();

  // Fetch admin users
  const { data: adminUsers, isLoading: isLoadingAdmins } = trpc.admin.getAdminUsers.useQuery();

  // Promote to admin mutation
  const promoteToAdminMutation = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => {
      showToast("Erfolg", "Benutzer wurde zum Admin befördert");
      setEmailInput("");
      refetchUsers();
    },
    onError: (error) => {
      showToast("Fehler", error.message || "Fehler beim Befördern zum Admin", "destructive");
    },
  });

  // Demote from admin mutation
  const demoteFromAdminMutation = trpc.admin.demoteFromAdmin.useMutation({
    onSuccess: () => {
      showToast("Erfolg", "Admin-Rechte wurden entzogen");
      refetchUsers();
    },
    onError: (error) => {
      showToast("Fehler", error.message || "Fehler beim Entziehen der Admin-Rechte", "destructive");
    },
  });

  const handlePromoteToAdmin = async () => {
    if (!emailInput.trim()) {
      showToast("Fehler", "Bitte geben Sie eine E-Mail-Adresse ein", "destructive");
      return;
    }

    setIsPromoting(true);
    try {
      await promoteToAdminMutation.mutateAsync({ email: emailInput });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleDemoteFromAdmin = async (userId: number) => {
    if (confirm("Möchten Sie diesen Benutzer wirklich zum Investor zurückstufen?")) {
      await demoteFromAdminMutation.mutateAsync({ userId });
    }
  };

  const regularUsers = allUsers?.filter((u) => u.role === "user") || [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin-Verwaltung</h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie Admin-Rechte und Benutzerkonten
        </p>
      </div>

      {/* Promote to Admin Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Benutzer zum Admin befördern
          </CardTitle>
          <CardDescription>
            Geben Sie die E-Mail-Adresse eines Benutzers ein, um ihn zum Admin zu befördern
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="E-Mail-Adresse eingeben..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handlePromoteToAdmin();
                }
              }}
              disabled={isPromoting}
            />
            <Button
              onClick={handlePromoteToAdmin}
              disabled={isPromoting || !emailInput.trim()}
              className="gap-2"
            >
              {isPromoting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird bearbeitet...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Befördern
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users Card */}
      <Card>
        <CardHeader>
          <CardTitle>Admin-Benutzer ({adminUsers?.length || 0})</CardTitle>
          <CardDescription>
            Liste aller Benutzer mit Admin-Rechten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAdmins ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : adminUsers && adminUsers.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-primary">
                          Admin
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("de-DE")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.email !== "grossdigitalpartner@gmail.com" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDemoteFromAdmin(user.id)}
                            disabled={demoteFromAdminMutation.isPending}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {demoteFromAdminMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Keine Admin-Benutzer gefunden
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regular Users Card */}
      <Card>
        <CardHeader>
          <CardTitle>Investor-Benutzer ({regularUsers.length})</CardTitle>
          <CardDescription>
            Liste aller Benutzer mit Investor-Rechten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : regularUsers.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regularUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Investor</Badge>
                      </TableCell>
                      <TableCell>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("de-DE")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Möchten Sie diesen Benutzer zum Admin befördern?")) {
                              promoteToAdminMutation.mutate({ email: user.email });
                            }
                          }}
                          disabled={promoteToAdminMutation.isPending}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          {promoteToAdminMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Keine Investor-Benutzer gefunden
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminManagement() {
  return (
    <DashboardLayout variant="admin">
      <AdminManagementContent />
    </DashboardLayout>
  );
}
