import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Story, backendInterface } from "../backend.d";

interface UseStoriesResult {
  activeStories: Story[];
  myStories: Story[];
  isLoading: boolean;
  addStory: (
    mediaUrl: string,
    mediaType: string,
    textOverlay: string,
  ) => Promise<void>;
  deleteStory: (storyId: bigint) => Promise<void>;
  refetch: () => void;
}

export function useStories(
  actor: backendInterface | null,
  isAuthenticated = false,
): UseStoriesResult {
  const queryClient = useQueryClient();

  const { data: activeStories = [], isLoading: loadingActive } = useQuery<
    Story[]
  >({
    queryKey: ["stories", "active"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveStories();
    },
    enabled: !!actor,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: myStories = [], isLoading: loadingMine } = useQuery<Story[]>({
    queryKey: ["stories", "mine"],
    queryFn: async () => {
      if (!actor || !isAuthenticated) return [];
      return actor.getMyStories();
    },
    enabled: !!actor && isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const refetch = () => {
    void queryClient.invalidateQueries({ queryKey: ["stories"] });
  };

  const addStory = async (
    mediaUrl: string,
    mediaType: string,
    textOverlay: string,
  ) => {
    if (!actor) throw new Error("Not connected");
    await actor.addStory(mediaUrl, mediaType, textOverlay);
    refetch();
  };

  const deleteStory = async (storyId: bigint) => {
    if (!actor) throw new Error("Not connected");
    await actor.deleteStory(storyId);
    refetch();
  };

  return {
    activeStories,
    myStories,
    isLoading: loadingActive || loadingMine,
    addStory,
    deleteStory,
    refetch,
  };
}
