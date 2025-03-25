"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Users, UserPlus, UserMinus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { 
  createTenant, 
  listUserTenants, 
  addUserToTenant, 
  removeUserFromTenant, 
  listTenantUsers,
  isGlobalAdmin,
  Tenant,
  TenantUser
} from "../utils/tenant-utils";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isCreateTenantDialogOpen, setIsCreateTenantDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isGlobalAdminUser, setIsGlobalAdminUser] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      description: "",
    }
  });

  // Check if user is global admin on page load
  useEffect(() => {
    checkGlobalAdmin();
  }, []);

  // Load tenants on page load
  useEffect(() => {
    loadTenants();
  }, []);

  // Load tenant users when a tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      loadTenantUsers(selectedTenant.id);
    }
  }, [selectedTenant]);

  // Check if current user is a global admin
  const checkGlobalAdmin = async () => {
    try {
      const isAdmin = await isGlobalAdmin();
      setIsGlobalAdminUser(isAdmin);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsGlobalAdminUser(false);
    }
  };

  // Load all tenants the user has access to
  const loadTenants = async () => {
    try {
      setLoading(true);
      const userTenants = await listUserTenants();
      setTenants(userTenants);
      
      // Select the first tenant by default if available
      if (userTenants.length > 0 && !selectedTenant) {
        setSelectedTenant(userTenants[0]);
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  // Load users for a specific tenant
  const loadTenantUsers = async (tenantId: string) => {
    try {
      const users = await listTenantUsers(tenantId);
      setTenantUsers(users);
    } catch (error) {
      console.error("Error loading tenant users:", error);
      toast.error("Failed to load tenant users");
    }
  };

  // Handle creating a new tenant
  const handleCreateTenant = async (data: { name: string; description: string }) => {
    try {
      setLoading(true);
      await createTenant(data.name, data.description);
      toast.success(`Tenant "${data.name}" created successfully`);
      reset();
      setIsCreateTenantDialogOpen(false);
      await loadTenants();
    } catch (error) {
      console.error("Error creating tenant:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create tenant");
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a user to the selected tenant
  const handleAddUser = async () => {
    if (!selectedTenant || !newUserEmail) return;
    
    try {
      setLoading(true);
      await addUserToTenant(newUserEmail, selectedTenant.id);
      toast.success(`User ${newUserEmail} added to ${selectedTenant.name}`);
      setNewUserEmail("");
      setIsAddUserDialogOpen(false);
      await loadTenantUsers(selectedTenant.id);
    } catch (error) {
      console.error("Error adding user to tenant:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add user to tenant");
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a user from the selected tenant
  const handleRemoveUser = async (username: string) => {
    if (!selectedTenant) return;
    
    try {
      setLoading(true);
      await removeUserFromTenant(username, selectedTenant.id);
      toast.success(`User removed from ${selectedTenant.name}`);
      await loadTenantUsers(selectedTenant.id);
    } catch (error) {
      console.error("Error removing user from tenant:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove user from tenant");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          {!isGlobalAdminUser && (
            <p className="text-sm text-muted-foreground mt-1">
              You can view your assigned teams. Only administrators can create and manage tenants.
            </p>
          )}
        </div>
        {isGlobalAdminUser && (
          <Dialog open={isCreateTenantDialogOpen} onOpenChange={setIsCreateTenantDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team that you can add users to.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleCreateTenant)}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                      id="name"
                      {...register("name", { required: "Team name is required" })}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Team"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tenant List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
            <CardDescription>
              {isGlobalAdminUser 
                ? "Select a team to manage its users"
                : "Select a team to view its details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <p>Loading tenants...</p>}
            {!loading && tenants.length === 0 && (
              <p>You don't have any teams assigned yet.</p>
            )}
            {!loading && tenants.length > 0 && (
              <div className="space-y-2">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${
                      selectedTenant?.id === tenant.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() => setSelectedTenant(tenant)}
                  >
                    <div>
                      <h3 className="font-medium">{tenant.name}</h3>
                      <p className="text-sm truncate">
                        {tenant.description || "No description"}
                      </p>
                    </div>
                    <Users className="h-5 w-5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Users */}
        {selectedTenant && (
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Users in {selectedTenant.name}</CardTitle>
              <CardDescription>
                {isGlobalAdminUser 
                  ? "Manage users in this team"
                  : "View users in this team"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGlobalAdminUser && (
                <div className="mb-4">
                  <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add User to Team</DialogTitle>
                        <DialogDescription>
                          Enter the email address of the user to add to this team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="user@example.com"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddUser} disabled={loading || !newUserEmail}>
                          {loading ? "Adding..." : "Add User"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              
              {loading && <p>Loading users...</p>}
              {!loading && tenantUsers.length === 0 && (
                <p>No users in this team yet.</p>
              )}
              {!loading && tenantUsers.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Added At</TableHead>
                      {isGlobalAdminUser && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantUsers.map((user) => (
                      <TableRow key={user.username}>
                        <TableCell>{user.name || '-'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{new Date(user.addedAt).toLocaleDateString()}</TableCell>
                        {isGlobalAdminUser && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveUser(user.username)}
                              disabled={loading}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 