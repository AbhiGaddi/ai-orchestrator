"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getProject, updateProject } from "@/lib/api";
import { Project } from "@/types";
import { toast } from "@/components/ui/Toast";
import ToastContainer from "@/components/ui/Toast";
import ProjectForm from "@/components/projects/ProjectForm";
import { Loader2 } from "lucide-react";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const data = await getProject(projectId);
                setProject(data);
            } catch (e: unknown) {
                toast("error", e instanceof Error ? e.message : "Failed to fetch project details");
                router.push("/projects");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProject();
    }, [projectId, router]);

    const handleSubmit = async (data: any) => {
        try {
            setIsSaving(true);
            await updateProject(projectId, data);
            toast("success", "Project settings updated");
            setTimeout(() => router.push("/projects"), 1000);
        } catch (e: unknown) {
            toast("error", e instanceof Error ? e.message : "Failed to update project");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
                <Loader2 size={40} color="#a855f7" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Loading workspace parameters...</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!project) return null;

    return (
        <>
            <ToastContainer />
            <ProjectForm
                title="Project Settings"
                description="Configure the execution boundaries and intelligence parameters for this workspace."
                initialData={project}
                onSubmit={handleSubmit}
                isLoading={isSaving}
            />
        </>
    );
}
