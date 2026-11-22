import { describe, expect, it } from 'vitest'

import { router, roleHome } from '@/router'

describe('Checkpoint 9 live compat Teacher routes', () => {
  // 2026-09-14 契约更新（hybrid kernel → compat shell）：slides 正式路由改为兼容闸门，
  // 由 SlidesCompatRedirect 按 mode=vnext ∧ session ∧ deck 决定是否加载 LIVE compatibility SlidesView。
  // 历史断言「slides 直连 SlidesView」与兼容边界冲突，已修正为闸门形状。
  // SlidesView 仍有 live 入口，详见 docs/LIVE_LEGACY_REGISTER.md。
  it('keeps formal prep on the prep-center home and gates slides through the compat shell', () => {
    const prep = router.getRoutes().find((route) => route.path === '/teacher-v3/prep')
    const slides = router.getRoutes().find((route) => route.path === '/teacher-v3/slides')
    expect(prep?.redirect).toBeUndefined()
    // G2 单实现约束（R1 外框嵌入）：/teacher-v3/prep 唯一实现 = teacher-prep-center/PrepHome，
    // 且挂在 TeacherV3Layout 之下（旧 AILP 备课页面已退役）。
    expect(String(prep?.components?.default)).toContain('teacher-prep-center/home/PrepHome.vue')
    expect(String(slides?.components?.default)).toContain('SlidesCompatRedirect.vue')
    expect(String(slides?.components?.default)).not.toContain('SlidesView.vue')
  })

  it('never uses the rejected immersive route as Teacher role landing', () => {
    expect(roleHome('teacher')).not.toContain('/teacher-v3/prep-immersive')
  })
})
