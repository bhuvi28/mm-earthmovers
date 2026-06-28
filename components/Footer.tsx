export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 shadow-inner">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="mb-6">
              <img 
                src="/new_logo.jpeg" 
                alt="MM Earthmovers Logo" 
                className="h-16 w-auto object-contain bg-white p-2 rounded-md"
              />
            </div>
            <p className="text-gray-300">Your premier supplier for earthmoving equipment spare parts, including loader spare parts, motor grader parts, and excavator components. Trusted earthmovers spare parts dealer in Kolkata, India.</p>
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
          {/* Column 4: Connect With Us */}
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-4">Connect With Us</h4>
            <p className="text-gray-300 text-sm mb-4">Follow us on social media for the latest updates on parts and services.</p>
            <div className="flex space-x-5">
              <a href="https://www.facebook.com/profile.php?id=61578501061236#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-amber-500 transition-colors hover:-translate-y-1 transform duration-200">
                <span className="sr-only">Facebook</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://www.instagram.com/m.m.earthmovers/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-amber-500 transition-colors hover:-translate-y-1 transform duration-200">
                <span className="sr-only">Instagram</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/m-m-earthmovers/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-amber-500 transition-colors hover:-translate-y-1 transform duration-200">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} MM Earthmovers. All Rights Reserved.</p>
          <p className="mt-2 text-xs text-gray-500">Disclaimer: All photos, part numbers and company/brand names used on this website are for references only.</p>
        </div>
      </div>
      
      {/* Developer Credits outside of main container */}
      <div className="bg-gray-950 py-4 text-center border-t border-gray-900">
        <p className="text-xs text-gray-600">
          Developed by <a href="https://www.linkedin.com/in/bhuvanmehta2808" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors duration-200">Bhuvan V Mehta</a> | Please write to the developer and share your feedback around the website <a href="mailto:bhuvan2160@gmail.com" className="hover:text-amber-500 transition-colors duration-200">here</a>
        </p>
      </div>
    </footer>
  )
}
