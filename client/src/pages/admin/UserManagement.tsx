import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Users, Search, Shield, User, Crown } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, refetch } = trpc.admin.getUsers.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const setUserRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rolle erfolgreich geändert");
      refetch();
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      toast.error("Fehler: " + error.message);
    },
  });

  // Only allow superadmins to access this page
  if (currentUser?.role !== "superadmin") {
    return (
      <DashboardLayout variant="admin">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-destructive" />
                Zugriff verweigert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Diese Seite ist nur für Superadmins zugänglich.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role === "admin" ? "user" : "admin");
    setIsDialogOpen(true);
  };

  const confirmRoleChange = () => {
    if (!selectedUser) return;
    setUserRole.mutate({
      userId: selectedUser.id,
      role: newRole,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <Badge variant="default" className="bg-purple-600">
            <Crown className="h-3 w-3 mr-1" />
            Superadmin
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="default">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            User
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout variant="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            User-Verwaltung
          </h1>
          <p className="text-muted-foreground mt-2">
            Verwalten Sie Benutzerrollen und Berechtigungen
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nach Email oder Name suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Rolle filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Rollen</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Benutzer ({filteredUsers?.length || 0})</CardTitle>
            <CardDescription>
              Übersicht aller Benutzer im System
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Lädt...
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Erstellt am</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">
                        {user.id}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.name || "-"}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.createdAt
                          ? format(new Date(user.createdAt), "PP", {
                              locale: de,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== "superadmin" &&
                          user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRoleChange(user)}
                            >
                              {user.role === "admin"
                                ? "Zu User"
                                : "Zu Admin"}
                            </Button>
                          )}
                        {user.role === "superadmin" && (
                          <span className="text-xs text-muted-foreground">
                            Geschützt
                          </span>
                        )}
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground">
                            Sie selbst
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Keine Benutzer gefunden
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Change Confirmation Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rolle ändern</AlertDialogTitle>
              <AlertDialogDescription>
                Möchten Sie die Rolle von{" "}
                <strong>{selectedUser?.email}</strong> von{" "}
                <strong>{selectedUser?.role}</strong> zu{" "}
                <strong>{newRole}</strong> ändern?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={confirmRoleChange}>
                Bestätigen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
