# DeepTrace React Frontend

## Overview
The frontend is a strictly-typed React + Vite interface styled with Tailwind CSS. It is built to facilitate single-image drag-and-drop uploads, API communication, and dynamic rendering of explanation heatmaps.

## Major Components

- **`App.tsx`**: The main orchestrator connecting the upload handler to the API and tracking overall state `inferenceResult` and `loading`.
- **`UploadCard.tsx`**: Provides the visual dropzone. Handles drag-event overrides, maps the selected file to a local object URL for preview, and emits the File object up to `App` for dispatch to the network.
- **`ResultCard.tsx`**: Renders dynamic components conditioned on the `inferenceResult` schema. It decodes the Base64 images for heatmaps provided by the backend and toggles between Spatial and Frequency overlays via local React state.

## State Handling
State is kept entirely within standard React Hooks (`useState`). No heavy state management library (Redux/Zustand) is used for Phase 1 MVP to minimize project footprint. 

## Testing Setup
Basic Vite testing can be enabled via `vitest` in the future. UI tests should target interactions within `UploadCard` to assert correct `FormData` wrapping prior to fetch requests.
