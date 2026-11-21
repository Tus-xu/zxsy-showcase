import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
for (const f of process.argv.slice(2)) {
  try {
    const doc = await PDFDocument.create()
    doc.registerFontkit(fontkit)
    const font = await doc.embedFont(fs.readFileSync(f), { subset: true })
    const page = doc.addPage([595, 842])
    page.drawText('离线演示 PDF 中文字体测试 √(x2)=x a2+b2=c2 期望 61/25', { x: 50, y: 760, size: 14, font, color: rgb(0.06,0.09,0.16) })
    const out = f.replace(/.*[\\/]/, '').replace(/\.[^.]+$/, '') + '.pdf'
    fs.writeFileSync('D:/zxsy-math-arena-showcase/scripts/' + out, await doc.save())
    console.log('OK', out, fs.statSync('D:/zxsy-math-arena-showcase/scripts/' + out).size)
  } catch (e) { console.log('FAIL', f, e.message) }
}
