function loadInterFaces() {
  const faces = [
    {
      weight: "400",
      source: 'url("/assets/fonts/inter-400.woff")',
    },
    {
      weight: "500",
      source: 'url("/assets/fonts/inter-500.woff")',
    },
    {
      weight: "600",
      source: 'url("/assets/fonts/inter-600.woff")',
    },
  ]
  faces.forEach(({ weight, source }) => {
    wx.loadFontFace({
      global: true,
      family: "Inter",
      source,
      desc: { weight },
    })
  })
}

App({
  onLaunch() {
    loadInterFaces()
  },
})
