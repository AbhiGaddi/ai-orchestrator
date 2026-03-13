"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ipc } from "@/lib/ipc";
import ProjectForm from "@/components/projects/ProjectForm";
import { Project } from "@/types";

export default function NewProjectPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (data: Partial<Project>) => {
        try {
            setIsLoading(true);
            await ipc.projects.create(data);
            router.push("/projects");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ProjectForm
            title="New Project"
            description="Point to a local codebase. Claude agents will run tasks inside that directory."
            onSubmit={handleSubmit}
            isLoading={isLoading}
        />
    );
}
