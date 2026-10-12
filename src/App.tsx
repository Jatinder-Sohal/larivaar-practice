function App() {
  return (
    <div className="min-h-screen bg-white p-6 flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Gurmukhi rendering test</h1>

      <section className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">Spaced (ground truth)</div>
        <p className="text-3xl leading-relaxed">
          ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">Larivaar (no spaces)</div>
        <p className="text-3xl leading-relaxed">
          ੴਸਤਿਨਾਮੁਕਰਤਾਪੁਰਖੁਨਿਰਭਉਨਿਰਵੈਰੁਅਕਾਲਮੂਰਤਿਅਜੂਨੀਸੈਭੰਗੁਰਪ੍ਰਸਾਦਿ॥
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">Siri Raag, Ang 14, line 3</div>
        <p className="text-3xl leading-relaxed">ਮੋਤੀ ਤ ਮੰਦਰ ਊਸਰਹਿ ਰਤਨੀ ਤ ਹੋਹਿ ਜੜਾਉ ॥</p>
        <p className="text-3xl leading-relaxed">ਮੋਤੀਤਮੰਦਰਊਸਰਹਿਰਤਨੀਤਹੋਹਿਜੜਾਉ॥</p>
      </section>
    </div>
  )
}

export default App