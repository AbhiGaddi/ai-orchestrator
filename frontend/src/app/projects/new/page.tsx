"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/api";
import ToastContainer, { toast } from "@/components/ui/Toast";
import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: any) => {
        try {
            setIsLoading(true);
            await createProject(data);
            toast("success", "Project initialized successfully");
            // Redirect back to projects list after a short delay
            setTimeout(() => router.push("/projects"), 1000);
        } catch (e: unknown) {
            toast("error", e instanceof Error ? e.message : "Failed to create project");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <ToastContainer />
            <ProjectForm
                title="Initialize Project"
                description="Define the workspace boundaries, source repositories, and quality gates for your AI agents."
                onSubmit={handleSubmit}
                isLoading={isLoading}
            />
        </>
    );
}
