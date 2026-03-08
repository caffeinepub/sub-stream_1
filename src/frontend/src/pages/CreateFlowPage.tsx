import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useAuth } from "../context/AuthContext";
import { CameraRecordPage } from "./CameraRecordPage";
import { PublishPage } from "./PublishPage";
import { type EditorEdits, VideoEditorPage } from "./VideoEditorPage";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "camera" | "editor" | "publish";

interface CreateFlowPageProps {
  onBack: () => void;
  onDone: () => void;
  onGoLive: () => void;
  initialMode?: "upload" | "record";
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CreateFlowPage({
  onBack,
  onDone,
  onGoLive,
}: CreateFlowPageProps) {
  const { actor } = useAuth();

  const [step, setStep] = useState<Step>("camera");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [edits, setEdits] = useState<EditorEdits | null>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  const goForward = (nextStep: Step) => {
    setDirection("forward");
    setStep(nextStep);
  };

  const goBack = (prevStep: Step) => {
    setDirection("back");
    setStep(prevStep);
  };

  const handleMediaReady = (file: File) => {
    setMediaFile(file);
    goForward("editor");
  };

  const handleYourStory = async (file: File, editsData: EditorEdits) => {
    if (!actor) {
      toast.error("Not connected. Please log in.");
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extBlob = ExternalBlob.fromBytes(bytes);
      const meta = await actor.uploadFile(
        file.name,
        file.type || "video/webm",
        BigInt(file.size),
        extBlob,
      );
      const mediaUrl = meta.externalBlob.getDirectURL();
      const firstText = editsData.textOverlays[0]?.text ?? "";
      await actor.addStory(mediaUrl, file.type || "video/webm", firstText);
      toast.success("Posted to Your Story!");
      onDone();
    } catch (err) {
      console.error(err);
      toast.error("Could not post story. Please try again.");
    }
  };

  const handleEditorNext = (file: File, editsData: EditorEdits) => {
    setEdits(editsData);
    setMediaFile(file);
    goForward("publish");
  };

  const getSlideProps = () => {
    if (direction === "forward") {
      return {
        initial: { opacity: 0, x: 60 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -60 },
      };
    }
    return {
      initial: { opacity: 0, x: -60 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 60 },
    };
  };

  return (
    <div className="fixed inset-0 z-50" style={{ background: "#000" }}>
      <AnimatePresence mode="wait">
        {step === "camera" && (
          <motion.div
            key="camera-step"
            {...getSlideProps()}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <CameraRecordPage
              onBack={onBack}
              onMediaReady={handleMediaReady}
              onGoLive={onGoLive}
            />
          </motion.div>
        )}

        {step === "editor" && mediaFile && (
          <motion.div
            key="editor-step"
            {...getSlideProps()}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <VideoEditorPage
              mediaFile={mediaFile}
              onBack={() => goBack("camera")}
              onYourStory={(file, editsData) =>
                void handleYourStory(file, editsData)
              }
              onNext={handleEditorNext}
            />
          </motion.div>
        )}

        {step === "publish" && mediaFile && edits && (
          <motion.div
            key="publish-step"
            {...getSlideProps()}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <PublishPage
              mediaFile={mediaFile}
              edits={edits}
              onBack={() => goBack("editor")}
              onPublished={onDone}
              onSaveDraft={onDone}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
