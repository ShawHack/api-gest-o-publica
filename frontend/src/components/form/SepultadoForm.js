import { useState, useEffect } from "react";
import formStyles from './Form.module.css';
import Input from './input';
import Select from "./Select";

function SepultadoForm({ handleSubmit, sepultadoData, btnText }) {
  const [sepultado, setSepultado] = useState(() => sepultadoData || {});
  const [preview, setPreview] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const tipoSepultura = ["Terra", "Laje", "Gaveta", "Jazigo", "Capela"];

  // --- Helpers de data (string BR) ---
  const toBR = (v) => {
    if (!v) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;               // já está BR
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {                           // YYYY-MM-DD
      const [y, m, d] = v.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(v);                                        // tenta converter
    if (!isNaN(d)) {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yy = d.getUTCFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    return v;
  };

  const maskDateBR = (v) => {
    const digits = (v || '').replace(/\D/g, '').slice(0, 8); // DDMMYYYY
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const isDateBRValida = (s) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
    if (!m) return false;
    const d = Number(m[1]), mth = Number(m[2]), y = Number(m[3]);
    if (mth < 1 || mth > 12 || d < 1 || d > 31 || y < 1000) return false;
    const diasNoMes = [31, (y%4===0 && y%100!==0) || (y%400===0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d <= diasNoMes[mth - 1];
  };

  // hidrata quando edita
  useEffect(() => {
    if (sepultadoData) {
      const imagensExistentes = sepultadoData.images || sepultadoData.image || [];
      setSepultado({
        ...sepultadoData,
        dtNasc: toBR(sepultadoData.dtNasc),
        dtFal: toBR(sepultadoData.dtFal),
        images: imagensExistentes,
      });
      setPreview(imagensExistentes);
    }
  }, [sepultadoData]);

  // preview de imagens
  function onFileChange(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
    setPreview(files.length ? files : (sepultado.images || []));
  }

  // mudanças de campos (com limpeza de erro do campo)
  function handleChange(e) {
    const { name, value } = e.target;
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _, ...rest } = prev;
      return rest;
    });

    if (name === 'dtNasc' || name === 'dtFal') {
      setSepultado((prev) => ({ ...prev, [name]: maskDateBR(value) }));
      return;
    }
    setSepultado((prev) => ({ ...prev, [name]: value }));
  }

  // validação (mesmo padrão do cadastro: erro em vermelho + mensagem)
  function validate(values) {
    const e = {};

    if (!values.nome?.trim()) e.nome = 'O nome é obrigatório';
  //  if (!isDateBRValida(values.dtNasc)) e.dtNasc = 'Data de nascimento inválida (DD/MM/AAAA)';
    if (!isDateBRValida(values.dtFal)) e.dtFal = 'Data de falecimento inválida (DD/MM/AAAA)';

    // Exemplo para tornar campos obrigatórios (descomente se quiser):
    // if (!values.cemiterio?.trim()) e.cemiterio = 'Cemitério é obrigatório';
     if (!values.quadra?.trim()) e.quadra = 'Quadra é obrigatória';
      if (!values.chapa?.trim()) e.chapa = 'Placa é obrigatória';

    // Idade opcional, mas válida se preenchida
   // if (values.idade !== undefined && values.idade !== null && values.idade !== '') {
    //  const n = Number(values.idade);
   //   if (Number.isNaN(n) || n < 0 || n > 150) e.idade = 'Idade inválida (0 a 150)';
 //   }

    return e;
  }

  // monta payload: se tiver files, usa FormData; senão JSON
  function buildPayload() {
    const campos = [
      "nome","idade","dtNasc","dtFal","nacionalidade","mae","pai",
      "cemiterio","quadra","rua","chapa","epitafio","tipoSepultura","latitude","longitude"
    ];

    if (newFiles.length > 0) {
      const fd = new FormData();
      campos.forEach((k) => {
        if (sepultado[k] !== undefined && sepultado[k] !== null) fd.append(k, sepultado[k]);
      });
      newFiles.forEach((f) => fd.append("images", f));
      return { payload: fd, isFormData: true };
    }

    const json = {};
    campos.forEach((k) => {
      if (sepultado[k] !== undefined && sepultado[k] !== null) json[k] = sepultado[k];
    });
    return { payload: json, isFormData: false };
  }

  function submit(e) {
    e.preventDefault();

    const currentErrors = validate(sepultado);
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    const { payload, isFormData } = buildPayload();
    handleSubmit(payload, { isFormData });
  }

  function renderImages() {
    if (preview.length > 0) {
      return preview.map((image, index) => {
        if (image instanceof File) {
          return (
            <img
              src={URL.createObjectURL(image)}
              alt={sepultado.nome || 'Sepultura'}
              key={`preview-${index}`}
            />
          );
        }
        const imageUrl =
          image?.startsWith("http") || image?.startsWith("/")
            ? image
            : `/images/sepultados/${image}`;
        return (
          <img
            src={imageUrl}
            alt={sepultado.nome || 'Sepultura'}
            key={`existing-${index}`}
          />
        );
      });
    }
    return <p>Nenhuma imagem disponível</p>;
  }

  return (
    <section className={formStyles.form_container}>
      {/* preview de imagens ocupa a largura total da grid */}
      <div className={formStyles.preview_sepultado_image} style={{ gridColumn: '1 / -1' }}>
        {renderImages()}
      </div>

      <form onSubmit={submit} noValidate>
        {/* Imagens */}
        <div className={formStyles.form_control}>
          <Input
            text="Imagens da sepultura"
            type="file"
            name="images"
            handleOnChange={onFileChange}
            multiple={true}
            accept="image/*"
          />
        </div>

        {/* Nome */}
        <div className={formStyles.form_control}>
          <Input
            text="Nome do Falecido"
            type="text"
            name="nome"
            placeholder="Digite o nome"
            handleOnChange={handleChange}
            value={sepultado.nome || ''}
            className={errors.nome ? formStyles.inputError : ''}
            required
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? 'err-nome' : undefined}
          />
          {errors.nome && <span id="err-nome" className={formStyles.errorMessage}>{errors.nome}</span>}
        </div>

        {/* Idade */}
        <div className={formStyles.form_control}>
          <Input
            text="Idade"
            type="number"
            name="idade"
            placeholder="Digite a idade"
            handleOnChange={handleChange}
            value={sepultado.idade ?? ''}
            min="0"
            max="150"
            className={errors.idade ? formStyles.inputError : ''}
            aria-invalid={!!errors.idade}
            aria-describedby={errors.idade ? 'err-idade' : undefined}
          />
          {errors.idade && <span id="err-idade" className={formStyles.errorMessage}>{errors.idade}</span>}
        </div>

        {/* Datas */}
        <div className={formStyles.form_control}>
          <Input
            text="Data de Nascimento"
            type="text"
            name="dtNasc"
            placeholder="DD/MM/AAAA"
            handleOnChange={handleChange}
            value={sepultado.dtNasc || ''}
            inputMode="numeric"
            maxLength={10}
            pattern="\d{2}/\d{2}/\d{4}"
            className={errors.dtNasc ? formStyles.inputError : ''}
            required
            aria-invalid={!!errors.dtNasc}
            aria-describedby={errors.dtNasc ? 'err-dtnasc' : undefined}
          />
          {errors.dtNasc && <span id="err-dtnasc" className={formStyles.errorMessage}>{errors.dtNasc}</span>}
        </div>

        <div className={formStyles.form_control}>
          <Input
            text="Data de Falecimento"
            type="text"
            name="dtFal"
            placeholder="DD/MM/AAAA"
            handleOnChange={handleChange}
            value={sepultado.dtFal || ''}
            inputMode="numeric"
            maxLength={10}
            pattern="\d{2}/\d{2}/\d{4}"
            className={errors.dtFal ? formStyles.inputError : ''}
            required
            aria-invalid={!!errors.dtFal}
            aria-describedby={errors.dtFal ? 'err-dtfal' : undefined}
          />
          {errors.dtFal && <span id="err-dtfal" className={formStyles.errorMessage}>{errors.dtFal}</span>}
        </div>

        {/* Dados complementares */}
        <div className={formStyles.form_control}>
          <Input
            text="Nacionalidade"
            type="text"
            name="nacionalidade"
            placeholder="Digite a naturalidade"
            handleOnChange={handleChange}
            value={sepultado.nacionalidade || ''}
          />
        </div>

        <div className={formStyles.form_control}>
          <Input
            text="Mãe"
            type="text"
            name="mae"
            placeholder="Digite a Mãe"
            handleOnChange={handleChange}
            value={sepultado.mae || ''}
          />
        </div>

        <div className={formStyles.form_control}>
          <Input
            text="Pai"
            type="text"
            name="pai"
            placeholder="Digite o Pai"
            handleOnChange={handleChange}
            value={sepultado.pai || ''}
          />
        </div>

        <div className={formStyles.form_control}>
          <Input
            text="Cemitério"
            type="text"
            name="cemiterio"
            placeholder="Digite o Cemitério"
            handleOnChange={handleChange}
            value={sepultado.cemiterio || ''}
            className={errors.cemiterio ? formStyles.inputError : ''}
            aria-invalid={!!errors.cemiterio}
            aria-describedby={errors.cemiterio ? 'err-cem' : undefined}
          />
          {errors.cemiterio && <span id="err-cem" className={formStyles.errorMessage}>{errors.cemiterio}</span>}
        </div>

        <div className={formStyles.form_control}>
          <Input
            text="Quadra"
            type="text"
            name="quadra"
            placeholder="Digite a quadra"
            handleOnChange={handleChange}
            value={sepultado.quadra || ''}
            className={errors.quadra ? formStyles.inputError : ''}
            aria-invalid={!!errors.quadra}
            aria-describedby={errors.quadra ? 'err-quadra' : undefined}
          />
          {errors.quadra && <span id="err-quadra" className={formStyles.errorMessage}>{errors.quadra}</span>}
        </div>

        <div className={formStyles.form_control}>
          <Input
            text="Rua"
            type="text"
            name="rua"
            placeholder="Digite a rua"
            handleOnChange={handleChange}
            value={sepultado.rua || ''}
          />
        </div>

        <div className={formStyles.form_control}>
  <Input
    text="Chapa"
    type="text"
    name="chapa"
    placeholder="Digite a chapa"
    handleOnChange={handleChange}
    value={sepultado.chapa || ''}
    className={errors.chapa ? formStyles.inputError : ''}  // <- aplica borda vermelha
    aria-invalid={!!errors.chapa}
    aria-describedby={errors.chapa ? 'err-chapa' : undefined}
  />
  {errors.chapa && (                                            // <- renderiza mensagem
    <span id="err-chapa" className={formStyles.errorMessage}>
      {errors.chapa}
    </span>
  )}
</div>



        <Select
  name="tipoSepultura"
  text="Tipo (Opcional)"
  options={tipoSepultura}
  handleOnChange={handleChange}
  value={sepultado.tipoSepultura || ''}
  className={errors.tipoSepultura ? formStyles.inputError : ''}
/>
{errors.tipoSepultura && (
  <span className={formStyles.errorMessage}>{errors.tipoSepultura}</span>
)}


        <div className={formStyles.form_control} style={{ gridColumn: '1 / -1' }}>
  <Input
    text="Epitáfio - dedicatória (Opcional )"
    type="textarea"
    name="epitafio"
    placeholder="Conte uma história de vida"
    handleOnChange={handleChange}
    value={sepultado.epitafio || ''}
    rows={6}  /* opcional, já temos min-height no CSS */
    className={errors.epitafio ? formStyles.inputError : ''}
  />
  {errors.epitafio && (
    <span className={formStyles.errorMessage}>{errors.epitafio}</span>
  )}
</div>


       

        <input type="submit" value={btnText} />
      </form>
    </section>
  );
}

export default SepultadoForm;
