import Ele from '@/core/ele'
import className from '@/config/class-name'

// --- Icons (inline SVG strings) ---
const ICONS = {
  chevronRight: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronDown: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6L8 11L13 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  folder: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 2A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5V5a1.5 1.5 0 00-1.5-1.5H7.707L6.354 2.146A.5.5 0 006 2H1.5z"/></svg>`,
  folderOpen: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M.54 3.87L.5 3a2 2 0 012-2h3.672a2 2 0 011.414.586l.828.828A2 2 0 009.828 3H14a2 2 0 012 2v.5a.5.5 0 01-1 0V5a1 1 0 00-1-1H9.828a3 3 0 01-2.12-.879l-.83-.828A1 1 0 005.173 2H2.5a1 1 0 00-1 .981L1.546 4h-.04L1.5 4v.5a.5.5 0 01-1 0v-.5a.5.5 0 01.04-.13zM1.059 5.5a.5.5 0 01.498-.45h12.886a.5.5 0 01.498.55l-.652 7.828A1.5 1.5 0 0112.798 14.8H3.202a1.5 1.5 0 01-1.49-1.372L1.058 5.5z"/></svg>`,
  file: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4 0h5.5v1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4.5h1V14a2 2 0 01-2 2H4a2 2 0 01-2-2V2a2 2 0 012-2z"/><path d="M9.5 3V0L14 4.5h-3A1.5 1.5 0 019.5 3z"/></svg>`,
  markdown: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zM2 2a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H2z"/><path fill-rule="evenodd" d="M9.146 8.146a.5.5 0 01.708 0L11.5 9.793l1.646-1.647a.5.5 0 01.708.708l-2 2a.5.5 0 01-.708 0l-2-2a.5.5 0 010-.708z"/><path fill-rule="evenodd" d="M11.5 5a.5.5 0 01.5.5v5a.5.5 0 01-1 0v-5a.5.5 0 01.5-.5z"/><path d="M3.56 11V5h1.44l1.5 2 1.5-2h1.44v6H8V7.14L6.5 9.14l-1.5-2V11H3.56z"/></svg>`,
  search: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="6.5" r="5" stroke-width="1.5"/><path d="M10.5 10.5L15 15" stroke-width="1.5" stroke-linecap="round"/></svg>`,
}

const MD_EXTENSIONS = ['.md', '.mdx', '.mdc', '.mkd', '.txt', '.markdown']

function isMarkdownFile(name: string): boolean {
  const lower = name.toLowerCase()
  return MD_EXTENSIONS.some(ext => lower.endsWith(ext))
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })
}

function makeNode(name: string, path: string, isDir: boolean): TreeNode | null {
  if (!name || name === '.' || name === '..' || name.startsWith('.')) {
    return null
  }
  const cleanName = isDir ? name.replace(/\/$/, '') : name
  const isMd = !isDir && isMarkdownFile(cleanName)
  if (!isDir && !isMd) return null
  return {
    name: cleanName,
    path,
    isFolder: isDir,
    isMarkdown: isMd,
    expanded: false,
    children: [],
    loaded: false,
    hidden: false,
  }
}

// --- TreeNode interface ---
export interface TreeNode {
  name: string
  path: string
  isFolder: boolean
  isMarkdown: boolean
  expanded: boolean
  children: TreeNode[]
  loaded: boolean
  hidden: boolean
}

// --- DirectoryParser: parses raw HTML from fetch/XHR ---
class DirectoryParser {
  parse(html: string, baseUrl: string): TreeNode[] {
    let nodes = this.parseAddRowJSON(html, baseUrl)
    if (nodes.length === 0) {
      nodes = this.parseAddRowRegex(html, baseUrl)
    }
    if (nodes.length === 0) {
      nodes = this.parseAnchors(html, baseUrl)
    }
    return sortNodes(nodes)
  }

  // Strategy 1: use JSON.parse to parse addRow arguments (most robust)
  private parseAddRowJSON(html: string, baseUrl: string): TreeNode[] {
    const callRegex = /addRow\(([\s\S]*?)\);/g
    const nodes: TreeNode[] = []
    let match: RegExpExecArray | null

    while ((match = callRegex.exec(html)) !== null) {
      try {
        const args = JSON.parse('[' + match[1] + ']')
        const name = String(args[0])
        const url = String(args[1])
        const isDir = Number(args[2]) === 1
        const fullPath = this.resolveUrl(baseUrl, url)
        const node = makeNode(name, fullPath, isDir)
        if (node) nodes.push(node)
      } catch {
        continue
      }
    }
    return nodes
  }

  // Strategy 2: lenient regex (fallback)
  private parseAddRowRegex(html: string, baseUrl: string): TreeNode[] {
    const regex =
      /addRow\("((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*(\d+)/g
    const nodes: TreeNode[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(html)) !== null) {
      const name = match[1]
      const url = match[2]
      const isDir = match[3] === '1'
      const fullPath = this.resolveUrl(baseUrl, url)
      const node = makeNode(name, fullPath, isDir)
      if (node) nodes.push(node)
    }
    return nodes
  }

  // Strategy 3: parse anchor tags (Firefox / other browsers)
  private parseAnchors(html: string, baseUrl: string): TreeNode[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const links = doc.querySelectorAll('a[href]')
    const nodes: TreeNode[] = []

    links.forEach(link => {
      const href = link.getAttribute('href')
      if (!href || href === '../' || href === './' || href === '/') return
      const name = link.textContent?.trim() || href
      const isDir = href.endsWith('/')
      const fullPath = this.resolveUrl(baseUrl, href)
      const node = makeNode(name, fullPath, isDir)
      if (node) nodes.push(node)
    })
    return nodes
  }

  private resolveUrl(base: string, relative: string): string {
    try {
      return new URL(relative, base).href
    } catch {
      return base + relative
    }
  }
}

// --- DirectoryLoader: tries multiple fetch strategies ---
class DirectoryLoader {
  private cache: Map<string, TreeNode[]> = new Map()
  private parser = new DirectoryParser()

  async loadDirectory(path: string): Promise<TreeNode[]> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!
    }

    // Strategy 1: iframe (reads Chrome's own rendered directory listing DOM)
    let nodes = await this.loadViaIframe(path)

    // Strategy 2: XHR + parse addRow from HTML
    if (nodes.length === 0) {
      const html = await this.fetchXHR(path)
      if (html) {
        nodes = this.parser.parse(html, path)
      }
    }

    // Strategy 3: background script fetch + parse
    if (nodes.length === 0) {
      const html = await this.fetchViaBackground(path)
      if (html) {
        nodes = this.parser.parse(html, path)
      }
    }

    if (nodes.length > 0) {
      this.cache.set(path, nodes)
    }
    return nodes
  }

  // Load via hidden iframe — reads Chrome's rendered directory listing DOM
  private loadViaIframe(url: string): Promise<TreeNode[]> {
    return new Promise(resolve => {
      const iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;width:0;height:0;border:none;opacity:0;pointer-events:none;z-index:-1'
      iframe.src = url

      const timer = setTimeout(() => {
        cleanup()
        resolve([])
      }, 5000)

      const cleanup = () => {
        clearTimeout(timer)
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }

      iframe.onload = () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document
          if (!doc) {
            cleanup()
            resolve([])
            return
          }

          // Chrome renders directory entries as <a class="icon dir"> or <a class="icon file">
          const links = doc.querySelectorAll('a.icon')
          const nodes: TreeNode[] = []

          links.forEach(link => {
            const isDir = link.classList.contains('dir')
            const name = (link.textContent || '').replace(/\/$/, '')
            const href = link.getAttribute('href') || ''
            if (!href) return

            let fullPath: string
            try {
              fullPath = href.startsWith('file://')
                ? href
                : new URL(href, url).href
            } catch {
              fullPath = url + href
            }

            const node = makeNode(name, fullPath, isDir)
            if (node) nodes.push(node)
          })

          cleanup()
          resolve(sortNodes(nodes))
        } catch {
          cleanup()
          resolve([])
        }
      }

      iframe.onerror = () => {
        cleanup()
        resolve([])
      }

      document.body.appendChild(iframe)
    })
  }

  private fetchXHR(url: string): Promise<string | null> {
    return new Promise(resolve => {
      try {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url)
        xhr.onload = () => {
          if (xhr.responseText && xhr.responseText.length > 0) {
            resolve(xhr.responseText)
          } else {
            resolve(null)
          }
        }
        xhr.onerror = () => resolve(null)
        xhr.ontimeout = () => resolve(null)
        xhr.timeout = 5000
        xhr.send()
      } catch {
        resolve(null)
      }
    })
  }

  private fetchViaBackground(url: string): Promise<string | null> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(
          { action: 'bg-fetch', data: { url } },
          response => {
            if (chrome.runtime.lastError) {
              resolve(null)
              return
            }
            if (response?.success && response.data) {
              resolve(response.data)
            } else {
              resolve(null)
            }
          },
        )
      } catch {
        resolve(null)
      }
    })
  }

  clearCache() {
    this.cache.clear()
  }
}

// --- FileTree UI class ---
export default class FileTree {
  private panel: Ele<HTMLElement>
  private contentArea: Ele<HTMLElement>
  private searchInput: HTMLInputElement
  private loader = new DirectoryLoader()
  private rootNodes: TreeNode[] = []
  private expandedFolders: Set<string>
  private searchQuery: string = ''
  private currentFilePath: string
  private rootPath: string

  constructor(expandedFolders: string[] = []) {
    this.expandedFolders = new Set(expandedFolders)
    this.currentFilePath = window.location.href
    this.rootPath = this.getDirectoryPath(this.currentFilePath)
    this.create()
    this.loadRoot()
  }

  get ele(): HTMLElement {
    return this.panel.ele
  }

  private getDirectoryPath(filePath: string): string {
    const idx = filePath.lastIndexOf('/')
    return idx >= 0 ? filePath.substring(0, idx + 1) : filePath
  }

  private create() {
    this.panel = new Ele<HTMLElement>('aside', {
      className: className.FILE_TREE_PANEL,
    })

    const header = new Ele<HTMLElement>('div', {
      className: className.FILE_TREE_HEADER,
    })
    const titleSpan = document.createElement('span')
    titleSpan.className = 'md-reader__file-tree-side__title'
    titleSpan.textContent = 'Files'
    header.append(titleSpan)

    const searchWrap = new Ele<HTMLElement>('div', {
      className: className.FILE_TREE_SEARCH,
    })
    const searchIcon = document.createElement('span')
    searchIcon.className = 'md-reader__file-tree-side__search-icon'
    searchIcon.innerHTML = ICONS.search
    this.searchInput = document.createElement('input')
    this.searchInput.type = 'text'
    this.searchInput.placeholder = 'Search files...'
    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput.value.toLowerCase().trim()
      this.renderTree()
    })
    searchWrap.append(searchIcon)
    searchWrap.append(this.searchInput)

    this.contentArea = new Ele<HTMLElement>('div', {
      className: className.FILE_TREE_CONTENT,
    })

    this.panel.append(header)
    this.panel.append(searchWrap)
    this.panel.append(this.contentArea)
  }

  private async loadRoot() {
    this.rootNodes = await this.loader.loadDirectory(this.rootPath)

    for (const node of this.rootNodes) {
      if (node.isFolder && this.expandedFolders.has(node.path)) {
        node.expanded = true
        await this.loadChildren(node)
      }
    }

    this.renderTree()
  }

  private async loadChildren(node: TreeNode): Promise<void> {
    if (node.loaded || !node.isFolder) return

    node.children = await this.loader.loadDirectory(node.path)
    node.loaded = true

    for (const child of node.children) {
      if (child.isFolder && this.expandedFolders.has(child.path)) {
        child.expanded = true
        await this.loadChildren(child)
      }
    }
  }

  private renderTree() {
    this.contentArea.innerHTML = ''
    const treeContainer = document.createElement('div')
    treeContainer.className = className.FILE_TREE

    if (this.rootNodes.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText =
        'padding: 16px; color: var(--color-text-gray); font-size: 12px; text-align: center;'
      empty.textContent = 'No files found'
      treeContainer.appendChild(empty)
    } else {
      this.renderNodes(this.rootNodes, treeContainer, 0)
    }

    this.contentArea.append(treeContainer)
  }

  private renderNodes(
    nodes: TreeNode[],
    container: HTMLElement,
    depth: number,
  ) {
    for (const node of nodes) {
      if (this.searchQuery) {
        const matches = node.name.toLowerCase().includes(this.searchQuery)
        const hasChildren = this.hasMatchingChildren(node)
        if (!matches && !hasChildren) continue
      }

      const item = document.createElement('div')
      item.className = className.FILE_TREE_ITEM
      item.setAttribute('data-path', node.path)
      item.style.paddingLeft = `${12 + depth * 16}px`

      if (node.path === this.currentFilePath) {
        item.classList.add('active')
      }

      if (node.isFolder) {
        item.classList.add('is-folder')
        item.innerHTML = `
          <span class="file-chevron">${
            node.expanded ? ICONS.chevronDown : ICONS.chevronRight
          }</span>
          <span class="file-icon">${
            node.expanded ? ICONS.folderOpen : ICONS.folder
          }</span>
          <span class="file-name">${this.highlightSearch(node.name)}</span>
        `
        item.addEventListener('click', async e => {
          e.preventDefault()
          e.stopPropagation()
          await this.toggleNode(node)
        })
      } else {
        item.innerHTML = `
          <span class="file-chevron"></span>
          <span class="file-icon">${
            node.isMarkdown ? ICONS.markdown : ICONS.file
          }</span>
          <span class="file-name">${this.highlightSearch(node.name)}</span>
        `
        item.addEventListener('click', e => {
          e.preventDefault()
          window.location.href = node.path
        })
      }

      container.appendChild(item)

      if (node.isFolder && node.expanded && node.children.length > 0) {
        this.renderNodes(node.children, container, depth + 1)
      }
    }
  }

  private async toggleNode(node: TreeNode) {
    node.expanded = !node.expanded

    if (node.expanded && !node.loaded) {
      await this.loadChildren(node)
    }

    if (node.expanded) {
      this.expandedFolders.add(node.path)
    } else {
      this.expandedFolders.delete(node.path)
    }

    this.saveExpandedFolders()
    this.renderTree()
  }

  private saveExpandedFolders() {
    chrome.runtime.sendMessage({
      action: 'storage',
      data: {
        key: 'expandedFolders',
        value: Array.from(this.expandedFolders),
      },
    })
  }

  private hasMatchingChildren(node: TreeNode): boolean {
    if (!node.isFolder || !node.children) return false
    return node.children.some(
      child =>
        child.name.toLowerCase().includes(this.searchQuery) ||
        this.hasMatchingChildren(child),
    )
  }

  private highlightSearch(text: string): string {
    if (!this.searchQuery) return this.escapeHtml(text)
    const escaped = this.escapeHtml(text)
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi')
    return escaped.replace(regex, '<mark>$1</mark>')
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
