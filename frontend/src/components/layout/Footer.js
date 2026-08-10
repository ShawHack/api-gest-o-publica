import styles from './Footer.module.css'
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react'

function Footer() {
  const handleLocationClick = () => {
    // Coordenadas aproximadas da Rua Coronel Joaquim Piza, 192, Garça-SP
    const address = "Rua Coronel Joaquim Piza, 192, Garça, SP"
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  const handleEmailClick = () => {
    window.open('mailto:tecnologia2@garca.sp.gov.br', '_blank')
  }

  const handlePhoneClick = () => {
    window.open('tel:+551434076618', '_blank')
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footer_container}>
        {/* Seção Principal */}
        <div className={styles.footer_main}>
          <div className={styles.footer_brand}>
            <h3 className={styles.footer_title}>SEMIT</h3>
            <p className={styles.footer_subtitle}>Secretaria de Inovação e Tecnologia</p>
            <p className={styles.footer_description}>
              Desenvolvendo soluções tecnológicas para a cidade de Garça
            </p>
          </div>

          {/* Informações de Contato */}
          <div className={styles.contact_info}>
            <h4 className={styles.contact_title}>Contato</h4>

            <div className={styles.contact_item} onClick={handleLocationClick}>
              <MapPin className={styles.contact_icon} />
              <div className={styles.contact_text}>
                <span>Rua Coronel Joaquim Piza, 192</span>
                <span className={styles.contact_secondary}>Garça - SP</span>
              </div>
              <ExternalLink className={styles.external_icon} />
            </div>

            <div className={styles.contact_item} onClick={handlePhoneClick}>
              <Phone className={styles.contact_icon} />
              <div className={styles.contact_text}>
                <span>(14) 3407-6618</span>
              </div>
            </div>

            <div className={styles.contact_item} onClick={handleEmailClick}>
              <Mail className={styles.contact_icon} />
              <div className={styles.contact_text}>
                <span>tecnologia2@garca.sp.gov.br</span>
              </div>
            </div>

            <div className={styles.contact_item}>
              <Clock className={styles.contact_icon} />
              <div className={styles.contact_text}>
                <span>08:00 às 11:00</span>
                <span className={styles.contact_secondary}>13:00 às 17:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className={styles.footer_bottom}>
          <p className={styles.copyright}>
            © 2025 <span className={styles.bold}>SEMIT</span> - Secretaria de Inovação e Tecnologia
          </p>
          <p className={styles.powered}>
            Memorial Santa Faustina - Garça/SP
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer