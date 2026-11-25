(() => {
  const definitions = {
    extrema: {
      label: '移动切点', symbol: 'a', latex: 'f(x)=x^3-3x', start: -1,
      min: -2, max: 2, xrange: [-2.4, 2.4], yrange: [-4.5, 4.5],
      points: [-1, 1], presets: [['−1.4', -1.4], ['−1', -1], ['−0.6', -0.6], ['1', 1]],
      f: (x) => x ** 3 - 3 * x, derivative: (x) => 3 * x ** 2 - 3,
    },
    flat: {
      label: '移动切点', symbol: 'a', latex: 'f(x)=x^3', start: 0,
      min: -1.5, max: 1.5, xrange: [-1.7, 1.7], yrange: [-4.5, 4.5],
      points: [0], presets: [['−0.8', -0.8], ['0', 0], ['0.8', 0.8]],
      f: (x) => x ** 3, derivative: (x) => 3 * x ** 2,
    },
    secant: {
      label: '改变两点横坐标差', symbol: 'h', latex: 'f(x)=x^2', start: 0.8,
      min: -1.5, max: 1.5, xrange: [-1.1, 3.1], yrange: [-1.5, 7.5],
      points: [1], presets: [['−0.5', -0.5], ['0', 0], ['0.5', 0.5]],
      f: (x) => x ** 2, derivative: (x) => 2 * x,
    },
  }
  const palette = { curve: '#4338ca', line: '#cb7b35', grid: '#e6eaf3', axis: '#9caac0', muted: '#52617b', point: '#fdfdff' }
  const number = (value) => {
    if (Math.abs(value) < 0.00001) return '0'
    const rounded = Number(value.toFixed(2))
    const text = String(rounded).replace('-', '−')
    return Math.abs(rounded - value) > 0.00001 ? '≈' + text : text
  }

  function create(kind, previous, onChange) {
    const config = definitions[kind]
    const container = document.createElement('figure')
    container.className = 'figure-widget'
    container.dataset.figure = kind
    const header = document.createElement('div')
    header.className = 'figure-heading'
    const title = document.createElement('strong')
    if (window.katex) window.katex.render(config.latex, title, { throwOnError: false })
    else title.textContent = config.latex
    const legend = document.createElement('span')
    legend.className = 'figure-legend'
    legend.innerHTML = '<span class="legend-curve">函数</span><span class="legend-line">辅助线</span>'
    header.append(title, legend)

    const canvas = document.createElement('canvas')
    canvas.className = 'figure-canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', '函数与辅助线。图下提供当前坐标和斜率。')
    const readout = document.createElement('output')
    readout.className = 'figure-readout'
    const controls = document.createElement('div')
    controls.className = 'figure-controls'
    const label = document.createElement('label')
    label.append(config.label + ' ' + config.symbol)
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = config.min
    slider.max = config.max
    slider.step = 0.1
    slider.value = Number.isFinite(previous) ? previous : config.start
    label.append(slider)
    controls.append(label)
    const presets = document.createElement('div')
    presets.className = 'figure-presets'
    for (const [text, value] of config.presets) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'action'
      button.textContent = text
      button.setAttribute('aria-label', '设置 ' + config.symbol + ' 为 ' + text)
      button.addEventListener('click', () => {
        slider.value = value
        draw()
        onChange(Number(slider.value))
      })
      presets.append(button)
    }
    container.append(header, canvas, readout, controls, presets)

    function draw() {
      const parameter = Number(slider.value)
      const movingX = kind === 'secant' ? 1 + parameter : parameter
      const movingY = config.f(movingX)
      const lineX = kind === 'secant' ? 1 : movingX
      const lineY = config.f(lineX)
      const slope = kind === 'secant' ? 2 + parameter : config.derivative(movingX)
      const lineKind = kind === 'secant' && parameter !== 0 ? '割线' : '切线'
      readout.replaceChildren()
      for (const text of [
        config.symbol + ' = ' + number(parameter),
        '点 (' + number(movingX) + ', ' + number(movingY) + ')',
        lineKind + '斜率 ' + number(slope),
      ]) {
        const entry = document.createElement('span')
        entry.textContent = text
        readout.append(entry)
      }
      slider.setAttribute('aria-valuetext', readout.textContent.replaceAll(')切线', ')，切线').replaceAll(')割线', ')，割线'))
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width < 1 || bounds.height < 1) return
      const width = bounds.width
      const height = bounds.height
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const ctx = canvas.getContext('2d')
      ctx.scale(ratio, ratio)
      const left = 37
      const right = width - 20
      const top = 13
      const bottom = height - 21
      const [xmin, xmax] = config.xrange
      const [ymin, ymax] = config.yrange
      const px = (x) => left + (x - xmin) / (xmax - xmin) * (right - left)
      const py = (y) => bottom - (y - ymin) / (ymax - ymin) * (bottom - top)
      function stroke(x1, y1, x2, y2, color, weight = 1) {
        ctx.beginPath()
        ctx.lineWidth = weight
        ctx.strokeStyle = color
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      ctx.font = '12px Microsoft YaHei, sans-serif'
      for (let x = Math.ceil(xmin); x <= xmax; x++) {
        stroke(px(x), top, px(x), bottom, palette.grid)
        ctx.fillStyle = palette.muted
        ctx.textAlign = 'center'
        ctx.fillText(number(x), px(x), bottom + 15)
      }
      for (let y = Math.ceil(ymin / 2) * 2; y <= ymax; y += 2) {
        stroke(left, py(y), right, py(y), palette.grid)
        ctx.fillStyle = palette.muted
        ctx.textAlign = 'right'
        ctx.fillText(number(y), left - 7, py(y) + 4)
      }
      stroke(px(0), top, px(0), bottom, palette.axis)
      stroke(left, py(0), right, py(0), palette.axis)
      ctx.textAlign = 'left'
      ctx.fillText('x', right + 3, py(0) + 3)

      ctx.save()
      ctx.beginPath()
      ctx.rect(left, top, right - left, bottom - top)
      ctx.clip()
      if(kind==='extrema'){for(const [a,b,c] of [[xmin,-1,'#e8f4ed'],[-1,1,'#fbf0e3'],[1,xmax,'#e8f4ed']]){ctx.fillStyle=c;ctx.globalAlpha=.58;ctx.fillRect(px(a),top,px(b)-px(a),bottom-top);ctx.globalAlpha=1}}
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let sample = 0; sample <= 160; sample++) {
        const x = xmin + sample * (xmax - xmin) / 160
        const y = config.f(x)
        if (sample === 0) ctx.moveTo(px(x), py(y))
        else ctx.lineTo(px(x), py(y))
      }
      ctx.lineWidth = 3
      ctx.strokeStyle = palette.curve
      ctx.stroke()
      ctx.setLineDash([6, 4])
      const line = (x) => lineY + slope * (x - lineX)
      stroke(px(xmin), py(line(xmin)), px(xmax), py(line(xmax)), palette.line, 2)
      ctx.setLineDash([])
      for (const x of config.points) {
        ctx.beginPath()
        ctx.arc(px(x), py(config.f(x)), 4.4, 0, Math.PI * 2)
        ctx.fillStyle = palette.curve
        ctx.fill()
        if(kind==='extrema'){ctx.fillStyle='#51428f';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(x===-1?'极大值点':'极小值点',px(x),py(config.f(x))+(x===-1?-12:18));}
      }
      ctx.beginPath()
      ctx.arc(px(movingX), py(movingY), 6, 0, Math.PI * 2)
      ctx.fillStyle = palette.line
      ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = palette.point
      ctx.stroke()
      ctx.restore()
    }

    slider.addEventListener('input', draw)
    slider.addEventListener('change', () => onChange(Number(slider.value)))
    let dragging=false;
    const movePoint=(e)=>{const rect=canvas.getBoundingClientRect();const [lo,hi]=config.xrange;let x=lo+(e.clientX-rect.left-37)/(rect.width-57)*(hi-lo);let v=kind==='secant'?x-1:x;v=Math.max(config.min,Math.min(config.max,Math.round(v*10)/10));slider.value=String(v);draw();onChange(v);};
    canvas.addEventListener('pointerdown',e=>{dragging=true;canvas.setPointerCapture(e.pointerId);movePoint(e)});canvas.addEventListener('pointermove',e=>{if(dragging)movePoint(e)});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return { container, dispose: () => observer.disconnect() }
  }
  window.V5_CHARTS = { create }
})()
