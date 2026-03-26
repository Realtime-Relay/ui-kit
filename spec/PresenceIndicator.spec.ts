/**
 * PresenceIndicator — Component Specification
 * =============================================
 *
 * Source: src/indicators/PresenceIndicator.tsx
 * Requirements: requirements/PresenceIndicator.md
 * Tests: src/indicators/PresenceIndicator.test.tsx (TODO)
 *
 * ## Component Signature
 *
 * ```tsx
 * <PresenceIndicator
 *   online={boolean}
 *   onlineColor?: string
 *   offlineColor?: string
 *   size?: number
 * />
 * ```
 *
 * ## Rendering
 *
 * Renders a `<span>` element styled as a filled circle.
 *
 * ### HTML Structure
 * ```html
 * <span role="status" aria-label="Online|Offline"
 *   style="display:inline-block; width:{size}px; height:{size}px;
 *          border-radius:50%; background-color:{color};
 *          box-shadow:{glow}; transition:...">
 * </span>
 * ```
 *
 * ### State Mapping
 * | online | color source    | glow              |
 * |--------|----------------|--------------------|
 * | true   | onlineColor    | 3px ring at 20%    |
 * | false  | offlineColor   | none               |
 *
 * ### Color Resolution Order
 * 1. Prop value (onlineColor / offlineColor)
 * 2. CSS variable (--relay-presence-online / --relay-presence-offline)
 * 3. Hardcoded fallback (#22c55e / #ef4444)
 *
 * ## Sizing
 *
 * | Prop value | Dot diameter | Recommended use case     |
 * |------------|-------------|--------------------------|
 * | 6-8        | 6-8px       | Compact lists, tables    |
 * | 10-12      | 10-12px     | Body text, default       |
 * | 16-24      | 16-24px     | Headers, cards           |
 * | 32-48      | 32-48px     | Hero displays, features  |
 *
 * Glow extends ~3px beyond dot edge.
 *
 * ## SDK Integration
 *
 * ```tsx
 * // app.connection.presence() callback shape:
 * {
 *   event: 'connected' | 'disconnected',
 *   device_ident: string,
 *   data: { start: number, stop?: number }
 * }
 *
 * // useRelayPresence hook:
 * const { online, lastEvent, isLoading, error } = useRelayPresence(deviceIdent);
 * <PresenceIndicator online={online ?? false} />
 * ```
 *
 * ## Accessibility
 * - role="status" — live region for screen readers
 * - aria-label — "Online" or "Offline"
 * - Visual glow provides secondary differentiation beyond color alone
 *
 * ## Edge Cases
 * - online=false when status unknown (safe default)
 * - size=0 renders invisible but DOM element exists
 * - size>48 works but glow may look disproportionate
 * - Inline placement works due to inline-block display
 * - Flex container placement works due to flexShrink: 0
 */
