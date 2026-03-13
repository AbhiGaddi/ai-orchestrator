"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ipc } from "@/lib/ipc";
import { Project } from "@/types";
import ProjectForm from "@/components/projects/ProjectForm";
import { Loader2 } from "lucide-react";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id: projectId } = use(params);

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        ipc.projects.get(projectId)
            .then(setProject)
            .catch(() => router.push("/projects"))
            .finally(() => setIsLoading(false));
    }, [projectId, router]);

    const handleSubmit = async (data: Partial<Project>) => {
        try {
            setIsSaving(true);
            await ipc.projects.update(projectId, data);
            router.push("/projects");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
                <Loader2 size={24} color="#a855f7" className="animate-spin" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <ProjectForm
            title="Edit Project"
            description="Update the codebase path, description, or AI rules for this project."
            initialData={project}
            onSubmit={handleSubmit}
            isLoading={isSaving}
        />
    );
}
