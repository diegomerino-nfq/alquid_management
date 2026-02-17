import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Download, FileJson, ArrowRight, Activity } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Descarga de Informes",
      desc: "Ejecuta queries en cloud (Athena/BigQuery) y descarga resultados en CSV. Soporta múltiples regiones y entornos.",
      icon: <Download className="w-8 h-8 text-white" />,
      path: "/download",
      color: "bg-blue-600"
    },
    {
      title: "Extracción SQL",
      desc: "Genera scripts SQL limpios y formateados automáticamente con inyección de parámetros para auditoría o ejecución manual.",
      icon: <Database className="w-8 h-8 text-white" />,
      path: "/extract",
      color: "bg-indigo-600"
    },
    {
      title: "Editor JSON",
      desc: "Gestiona tu archivo de configuración queries.json. Realiza sustituciones masivas y limpieza de código.",
      icon: <FileJson className="w-8 h-8 text-white" />,
      path: "/editor",
      color: "bg-emerald-600"
    }
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-alquid-blue text-white shadow-2xl transform transition-all hover:shadow-blue-900/20">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
        <div className="relative z-10 px-8 py-24 md:px-16 text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/30 backdrop-blur-sm px-4 py-1.5 rounded-full text-blue-100 text-sm font-medium mb-6 border border-blue-400/30">
            <Activity size={16} /> Suite Corporativa v2.0
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            Herramientas de Datos <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-indigo-200">ALQUID</span>
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed opacity-90">
            Plataforma centralizada para la gestión, extracción y procesamiento eficiente de datos SQL en entornos multi-región.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button 
              onClick={() => navigate('/download')}
              className="bg-alquid-red hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Comenzar Ahora <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => navigate('/extract')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              Extracción SQL
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, idx) => (
          <div 
            key={idx}
            onClick={() => navigate(feature.path)}
            className="group bg-white p-8 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 cursor-pointer transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 group-hover:bg-gray-100 z-0`}></div>
            
            <div className="relative z-10">
              <div className={`${feature.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed mb-6 text-sm">
                {feature.desc}
              </p>
              <div className="flex items-center text-alquid-blue font-bold group-hover:gap-3 transition-all">
                Acceder <ArrowRight size={18} className="ml-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;