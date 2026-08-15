<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="name === 'menu'" d="M4 6h16M4 12h16M4 18h16" />
    <template v-else-if="name === 'folder'">
      <path d="M4 20h16a1 1 0 0 0 1-1V7H9l-2-2H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1z" />
    </template>
    <template v-else-if="name === 'file'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </template>
    <template v-else-if="name === 'toc'">
      <path d="M4 6h16M4 12h10M4 18h14" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'file-menu'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 18v-6M9 15h6" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="M6 9l6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="M9 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12M18 6L6 18" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 17v5" />
      <path d="M9 3h6l-1 7h3l-5 5-5-5h3z" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
    </template>
    <template v-else-if="name === 'bold'">
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />
    </template>
    <template v-else-if="name === 'italic'">
      <path d="M10 5h8M6 19h8M14 5l-4 14" />
    </template>
    <template v-else-if="name === 'strike'">
      <path d="M5 12h14M16 7a4 4 0 0 0-8 0c0 2 2 3 4 3.5S16 12 16 14a4 4 0 0 1-8 0" />
    </template>
    <template v-else-if="name === 'underline'">
      <path d="M7 5v6a5 5 0 0 0 10 0V5M5 19h14" />
    </template>
    <template v-else-if="name === 'highlight'">
      <path d="M4 20h16M9 4l-3 9h12l-3-9z" />
    </template>
    <template v-else-if="name === 'heading'">
      <path d="M6 5v14M18 5v14M6 12h12" />
    </template>
    <template v-else-if="name === 'list'">
      <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </template>
    <template v-else-if="name === 'list-ordered'">
      <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M4 16h2v2H4" />
    </template>
    <template v-else-if="name === 'task'">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </template>
    <template v-else-if="name === 'quote'">
      <path d="M3 21h6l2-8H5L3 21zM13 21h6l2-8h-6l-2 8zM5 13V6a3 3 0 0 1 3-3h1M15 13V6a3 3 0 0 1 3-3h1" />
    </template>
    <template v-else-if="name === 'code'">
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />
    </template>
    <template v-else-if="name === 'code-block'">
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13 5l-2 14" />
    </template>
    <template v-else-if="name === 'table'">
      <path d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M16 5v14" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.7 5.23" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13.3 18.77" />
    </template>
    <template v-else-if="name === 'image'">
      <path d="M4 5h16v14H4z" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 16l5-4 3 3 3-2 5 3" />
    </template>
    <template v-else-if="name === 'view-live'">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </template>
    <template v-else-if="name === 'view-split'">
      <path d="M4 5h16v14H4z" />
      <path d="M12 5v14" />
    </template>
    <template v-else-if="name === 'view-source'">
      <path d="M8 7l-4 5 4 5" />
      <path d="M16 7l4 5-4 5" />
      <path d="M13 5l-2 14" />
    </template>
    <template v-else-if="name === 'view-focus'">
      <path d="M4 9V5h4" />
      <path d="M20 9V5h-4" />
      <path d="M4 15v4h4" />
      <path d="M20 15v4h-4" />
      <path d="M9 12h6" />
    </template>
    <template v-else-if="name === 'template-doc'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </template>
    <template v-else-if="name === 'template-book'">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </template>
    <template v-else-if="name === 'template-calendar'">
      <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </template>
    <template v-else-if="name === 'template-sparkle'">
      <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 8h.01" />
    </template>
  </svg>
</template>

<script setup lang="ts">
export type AppIconName =
  | 'menu'
  | 'folder'
  | 'file'
  | 'settings'
  | 'toc'
  | 'plus'
  | 'file-menu'
  | 'chevron-down'
  | 'chevron-right'
  | 'trash'
  | 'close'
  | 'clock'
  | 'search'
  | 'pin'
  | 'sun'
  | 'moon'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'highlight'
  | 'heading'
  | 'list'
  | 'list-ordered'
  | 'task'
  | 'quote'
  | 'code'
  | 'code-block'
  | 'table'
  | 'link'
  | 'image'
  | 'view-live'
  | 'view-split'
  | 'view-source'
  | 'view-focus'
  | 'template-doc'
  | 'template-book'
  | 'template-calendar'
  | 'template-sparkle'
  | 'info'

withDefaults(
  defineProps<{
    name: AppIconName
    size?: number
  }>(),
  { size: 16 }
)
</script>
