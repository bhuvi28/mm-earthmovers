export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 shadow-inner">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <h3 className="text-xl font-extrabold text-amber-400 mb-4">MM <span className="text-amber-500">Earthmovers</span></h3>
            <p className="text-gray-300">Your premier supplier for quality replacement loader, motor grader and excavator parts. Built on trust and reliability.</p>
            <p className="text-gray-400 mt-4 text-sm">GSTIN: 19AITPM8593R1ZN</p>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#home" className="text-gray-300 hover:text-amber-400 transition-colors duration-200 hover:translate-x-1 inline-block">Home</a></li>
              <li><a href="#products-overview" className="text-gray-300 hover:text-amber-400 transition-colors duration-200 hover:translate-x-1 inline-block">Products</a></li>
              <li><a href="#why-choose-us" className="text-gray-300 hover:text-amber-400 transition-colors duration-200 hover:translate-x-1 inline-block">Why Choose Us</a></li>
              <li><a href="#about" className="text-gray-300 hover:text-amber-400 transition-colors duration-200 hover:translate-x-1 inline-block">About Us</a></li>
              <li><a href="#contact" className="text-gray-300 hover:text-amber-400 transition-colors duration-200 hover:translate-x-1 inline-block">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-4">Contact</h4>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start group">
                <svg className="w-5 h-5 mr-2 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <a 
                  href="https://maps.app.goo.gl/tnwchdtBBZ8AMbxz8" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition-colors duration-200"
                >
                  1, Metcalf Lane, Esplanade, Kolkata 700072
                </a>
              </li>
              <li className="flex items-center group">
                <svg className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <a 
                  href="tel:+918334887009" 
                  className="hover:text-amber-400 transition-colors duration-200"
                >
                  +91 8334887009
                </a>
              </li>
              <li className="flex items-center group">
                <svg className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <a 
                  href="mailto:hm.mmearthmovers@gmail.com" 
                  className="hover:text-amber-400 transition-colors duration-200"
                >
                  hm.mmearthmovers@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; 2025 MM Earthmovers. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  )
}
