export default function Page({ params }: { params: { locale: string } }) {
  return (
    <div>
      <h1>Locale: {params.locale}</h1>
    </div>
  );
}
