import { profile } from '../data.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        © {new Date().getFullYear()} {profile.name}
      </div>
    </footer>
  )
}
