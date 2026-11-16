const PuzzlePrepared = () => (
  <div className="anim-quizz grid h-32 w-80 grid-cols-4 content-center gap-2 rounded-2xl bg-gray-700 px-8">
    {Array.from({ length: 12 }, (_, i) => (
      <div key={i} className="h-5 rounded-md bg-white/30" />
    ))}
  </div>
)

export default PuzzlePrepared
