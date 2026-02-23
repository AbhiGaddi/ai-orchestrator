"use client";

import { useEffect, useState } from "react";
import { Project } from "@/types";
import { listProjects, createProject, updateProject } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import Link from 'next/link';
import { Edit2, ExternalLink } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [projectForm, setProjectForm] = useState({
        name: "",
        description: "",
        github_repos: "",
        coding_guidelines: "",
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            const data = await listProjects();
            setProjects(data);
        } catch (error: any) {
            toast("error", error.message || "Failed to fetch projects");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!projectForm.name) {
            toast("error", "Project name is required");
            return;
        }

        try {
            const payload = {
                name: projectForm.name,
                description: projectForm.description,
                github_repos: projectForm.github_repos
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                coding_guidelines: projectForm.coding_guidelines,
                services_context: {},
            };

            if (editingProjectId) {
                const updated = await updateProject(editingProjectId, payload);
                setProjects(projects.map(p => p.id === editingProjectId ? updated : p));
                toast("success", "Project updated successfully");
            } else {
                const created = await createProject(payload);
                setProjects([created, ...projects]);
                toast("success", "Project created successfully");
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast("error", error.message || "Operation failed");
        }
    };

    const resetForm = () => {
        setProjectForm({ name: "", description: "", github_repos: "", coding_guidelines: "" });
        setEditingProjectId(null);
    };

    const openEdit = (project: Project) => {
        setProjectForm({
            name: project.name,
            description: project.description || "",
            github_repos: (project.github_repos || []).join(", "),
            coding_guidelines: project.coding_guidelines || "",
        });
        setEditingProjectId(project.id);
        setIsDialogOpen(true);
    };

    return (
        <div className="container py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
                    <p className="text-muted-foreground content-sub">
                        Manage your AI Orchestrator execution contexts and isolation boundaries.
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="btn-primary" onClick={() => resetForm()}>Create Project</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] border-white/10 bg-[#141721] text-white">
                        <DialogHeader>
                            <DialogTitle>{editingProjectId ? 'Edit Project' : 'Create New Project'}</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                {editingProjectId
                                    ? 'Update the boundaries and repositories for this project.'
                                    : 'Define the boundaries and repositories for this project\'s AI execution context.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-slate-300">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Acme Web Client"
                                    className="bg-black/50 border-white/10"
                                    value={projectForm.name}
                                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description" className="text-slate-300">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="What does this project do?"
                                    className="bg-black/50 border-white/10 resize-none h-20"
                                    value={projectForm.description}
                                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="repos" className="text-slate-300">GitHub Repositories</Label>
                                <Input
                                    id="repos"
                                    placeholder="owner/repo1, owner/repo2"
                                    className="bg-black/50 border-white/10"
                                    value={projectForm.github_repos}
                                    onChange={(e) => setProjectForm({ ...projectForm, github_repos: e.target.value })}
                                />
                                <p className="text-xs text-slate-500">Comma separated format (e.g. AbhiGaddi/ai-orchestrator)</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="guidelines" className="text-slate-300">Coding Guidelines (Optional)</Label>
                                <Textarea
                                    id="guidelines"
                                    placeholder="e.g. Use Python 3.10 and strict type checking."
                                    className="bg-black/50 border-white/10 resize-none h-24"
                                    value={projectForm.coding_guidelines}
                                    onChange={(e) => setProjectForm({ ...projectForm, coding_guidelines: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="btn-primary border-none" onClick={handleSubmit}>
                                {editingProjectId ? 'Update Project' : 'Save Project'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[200px] rounded-xl skeleton"></div>
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border border-white/5 border-dashed rounded-xl bg-white/[0.02]">
                    <h3 className="text-xl font-bold mb-2">No projects yet</h3>
                    <p className="text-slate-400 mb-6 text-center max-w-sm">
                        Projects act as isolated sandboxes for your agents. Create one to get started.
                    </p>
                    <Button className="btn-primary" onClick={() => setIsDialogOpen(true)}>Create Project</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card key={project.id} className="bg-[#141721] border-white/10 hover:border-white/20 transition-colors">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl">{project.name}</CardTitle>
                                <CardDescription className="text-slate-400 line-clamp-2 min-h-[40px]">
                                    {project.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-4 border-b border-white/5 mx-6 px-0 mb-4">
                                <div className="flex flex-col gap-2 text-sm text-slate-300">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Repositories</span>
                                        <span className="font-mono text-xs">{project.github_repos?.length || 0} configured</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Guidelines</span>
                                        <span>{project.coding_guidelines ? "Yes" : "None"}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0 justify-between">
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        className="bg-white/5 hover:bg-white/10 border-white/10 text-xs h-8"
                                        onClick={() => openEdit(project)}
                                    >
                                        <Edit2 size={12} className="mr-2" /> Edit
                                    </Button>
                                    <Link href={`/projects/${project.id}`}>
                                        <Button variant="secondary" className="bg-white/5 hover:bg-white/10 border-white/10 text-xs h-8">
                                            <ExternalLink size={12} className="mr-2" /> Dashboard
                                        </Button>
                                    </Link>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Created {new Date(project.created_at).toLocaleDateString()}
                                </p>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
