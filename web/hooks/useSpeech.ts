"use client";
import { useCallback, useRef } from "react";

interface Disposable {
  stop(): void;
}

export function useSpeech(
  onResult: (text: string) => void,
  onError: (msg: string) => void
) {
  const recognizerRef = useRef<Disposable | null>(null);

  const start = useCallback(async () => {
    const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
    const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

    console.log(`[Speech] Azure keys present: ${Boolean(speechKey && speechRegion)}, region: ${speechRegion ?? "none"}`);

    if (speechKey && speechRegion) {
      try {
        console.log("[Speech] Loading Azure Speech SDK...");
        const SDK = await import("microsoft-cognitiveservices-speech-sdk");

        const speechConfig = SDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechRecognitionLanguage = "en-US";
        speechConfig.setProperty(
          SDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
          "3000"
        );
        speechConfig.enableDictation();

        const audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizing = (_sender, event) => {
          if (event.result.text) {
            console.log("[Speech] Recognizing (interim):", event.result.text.slice(0, 60));
          }
        };

        recognizer.recognized = (_sender, event) => {
          if (event.result.reason === SDK.ResultReason.RecognizedSpeech && event.result.text) {
            console.log("[Speech] Recognized:", event.result.text.slice(0, 60));
            onResult(event.result.text);
          }
        };

        recognizer.canceled = (_sender, event) => {
          const detail = event.errorDetails || SDK.CancellationReason[event.reason] || String(event.reason);
          console.error("[Speech] Canceled:", detail);
          if (event.reason === SDK.CancellationReason.Error) {
            onError(`Azure Speech error: ${detail}`);
          }
        };

        recognizer.sessionStopped = () => {
          console.log("[Speech] Session stopped");
        };

        await new Promise<void>((resolve, reject) => {
          recognizer.startContinuousRecognitionAsync(
            () => {
              console.log("[Speech] Azure recognition started");
              resolve();
            },
            (err) => {
              console.error("[Speech] Failed to start Azure recognition:", err);
              reject(err);
            }
          );
        });

        recognizerRef.current = {
          stop: () =>
            recognizer.stopContinuousRecognitionAsync(
              () => recognizer.close(),
              () => recognizer.close()
            )
        };
        return;
      } catch (err) {
        console.error("[Speech] Azure SDK failed, falling back to browser API:", err);
      }
    }

    console.log("[Speech] Using browser Web Speech API");
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      throw new Error(
        "No Speech API available. Set NEXT_PUBLIC_AZURE_SPEECH_KEY or use Chrome/Edge."
      );
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0]?.transcript ?? "";
          if (text) onResult(text);
        }
      }
    };

    recognition.onerror = (event: any) => onError(`Speech error: ${event.error}`);

    recognition.onend = () => {
      try {
        recognition.start();
      } catch {
        // Already started or disposed.
      }
    };

    recognition.start();
    recognizerRef.current = { stop: () => recognition.abort() };
  }, [onError, onResult]);

  const stop = useCallback(() => {
    recognizerRef.current?.stop();
    recognizerRef.current = null;
  }, []);

  return { start, stop };
}
