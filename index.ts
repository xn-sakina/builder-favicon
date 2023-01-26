import { basename, dirname, join } from 'path'
import sharp from 'sharp'
import toIco from 'to-ico'
import fs from 'fs-extra'
import chalk from 'chalk'
import { program } from 'commander'

enum EFormat {
  png = 'png',
  ico = 'ico',
}

interface IOpts {
  size: number
  format: EFormat
  output: string
}

const log = (msg: string) => {
  console.log(`${chalk.cyan('[builder-favicon]')}: ${msg}`)
}

const createTask = async (source: string, options: IOpts) => {
  const { size, output } = options
  const ins = sharp(source).resize(size)
  const outputDest = chalk.green(
    `${basename(dirname(output))}/${basename(output)}`
  )
  if (options.format === EFormat.ico) {
    const buffer = await ins.png().toBuffer()
    const icoBuffer = await toIco([buffer])
    fs.writeFileSync(output, icoBuffer)
    log(`create ico: ${outputDest}`)
  } else if (options.format === EFormat.png) {
    ins.png().toFile(output)
    log(`create png: ${outputDest}`)
  }
  // pass
}

const PREFIX = {
  apple: `apple-touch-icon`,
  android: `android-icon`,
}

const run = async (source: string, outputDir?: string) => {
  const tasks: Array<Promise<void>> = []
  if (!outputDir) {
    outputDir = join(dirname(source))
  }
  const outputBase = join(outputDir, './favicons')
  if (!fs.existsSync(outputBase)) {
    fs.mkdirSync(outputBase)
  }
  // favicons
  ;[16, 32, 96].forEach((size) => {
    tasks.push(
      createTask(source, {
        size,
        format: EFormat.png,
        output: join(outputBase, `./favicon-${size}x${size}.png`),
      })
    )
  })
  // apple
  ;[180].forEach((size) => {
    tasks.push(
      createTask(source, {
        size,
        format: EFormat.png,
        output: join(outputBase, `./${PREFIX.apple}-${size}x${size}.png`),
      })
    )
  })
  // android
  ;[192].forEach((size) => {
    tasks.push(
      createTask(source, {
        size,
        format: EFormat.png,
        output: join(outputBase, `./${PREFIX.android}-${size}x${size}.png`),
      })
    )
  })
  // ico
  ;[32].forEach((size) => {
    tasks.push(
      createTask(source, {
        size,
        format: EFormat.ico,
        output: join(outputBase, `./favicon.ico`),
      })
    )
  })
  await Promise.all(tasks)
  // write html
  const html = /* html */ `
<head>
  <link
    key="apple-icon-180x180.png"
    rel="apple-touch-icon"
    sizes="180x180"
    href="/favicons/${PREFIX.apple}-180x180.png"
  />
  <link
    key="android-icon-192x192.png"
    rel="icon"
    type="image/png"
    sizes="192x192"
    href="/favicons/${PREFIX.android}-192x192.png"
  />
  <link key="favicon-32x32.png" rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
  <link key="favicon-96x96.png" rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png" />
  <link key="favicon-16x16.png" rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
  <link key="favicon.ico" rel="shortcut icon" type="image/png" sizes="16x16" href="/favicon.ico" />

  <!-- optional -->
  <link key="favicon.svg" rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
</head>
`.trimStart()
  fs.writeFileSync(join(outputBase, './favicons.html'), html, 'utf-8')
  log(`create ${chalk.blue('favicons.html')} for copy`)
}

const tryPaths = (paths: string[]) => {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p
    }
  }
}

export const main = async () => {
  const pkgPath = tryPaths([
    join(__dirname, './package.json'),
    join(__dirname, '../package.json'),
  ])
  const pkg = require(pkgPath!)

  program
    .command('build <source> [outputDir]')
    .description(`build favicons from source image`)
    .action(run)

  program.version(pkg.version)
  program.parse(process.argv)
}
