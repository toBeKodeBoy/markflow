export type ImageExportMode =
  | 'typora-cache-absolute'
  | 'same-folder'
  | 'note-assets-folder'
  | 'custom-template'

export type ImageExportOverwriteStrategy = 'rename' | 'overwrite' | 'skip'

export interface ImageExportSettings {
  mode: ImageExportMode
  customTemplate?: string
  typoraRootDir?: string
  fileNameTemplate?: string
  overwriteStrategy?: ImageExportOverwriteStrategy
  bindNoteOnExport?: boolean
  downloadRemoteImages?: boolean
  syncUnusedAssets?: boolean
  unusedAssetsFolderName?: string
}
