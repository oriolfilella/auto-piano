# Diagrama de arquitectura actual

## Vista general del flujo

```mermaid
flowchart TD
    A[app/page.tsx] --> B[components/ScoreEditor.tsx]

    B --> C[components/Header]
    B --> D[components/ControlPanel]
    B --> E[components/editor/NoteInputPanel]
    B --> F[components/editor/PlaybackPanel]
    B --> G[components/VexFlowRender.tsx]

    B --> H[hooks/useAuth.ts]
    B --> I[hooks/useScore.ts]
    B --> J[hooks/useEditor.ts]
    B --> K[hooks/useHardware.ts]
    B --> L[hooks/useAudioPlayback.ts]
    B --> M[hooks/useKeyboardShortcuts.ts]

    I --> N[utils/musicLogic.ts]
    I --> O[utils/musicXMLParser.ts]
    I --> P[utils/superbaseClient.ts]

    J --> N
    K --> Q[utils/webSerialService.ts]
    K --> R[utils/webBluetoothService.ts]
    K --> S[utils/hardwareTranslator.ts]
    L --> T[utils/audioPlayer.ts]

    G --> U[components/vexflow/renderScore.ts]
    U --> V[components/vexflow/scoreHelpers.ts]
    U --> W[components/vexflow/types.ts]
    G --> N

    K --> X[Hardware piano / MIDI / USB / BLE]
    L --> Y[Audio del PC]
    I --> Z[Persistencia en Supabase]
```

## Flujo principal de interacción

```mermaid
sequenceDiagram
    participant User
    participant UI as ScoreEditor
    participant Hooks as Hooks (useEditor/useScore/useHardware)
    participant Renderer as VexFlowRenderer
    participant Utils as musicLogic / audioPlayer

    User->>UI: Edita nota / cambia compás / reproduce
    UI->>Hooks: Actualiza estado de partitura
    Hooks->>Utils: Calcula medidas / audio / hardware
    Hooks->>Renderer: Pasa notas seleccionadas y configuración
    Renderer->>Renderer: Dibuja pentagrama y notas con VexFlow
    Renderer-->>User: Muestra partitura interactiva
```

## Resumen del proyecto

- La app está organizada como una interfaz principal de Next.js que monta el editor de partituras.
- El componente central es ScoreEditor, que coordina varios hooks.
- El render visual se hace con VexFlow a través de VexFlowRender y sus módulos auxiliares.
- La lógica musical y los servicios de audio/hardware se separan en utilidades.
- La persistencia y autenticación están apoyadas por Supabase.
