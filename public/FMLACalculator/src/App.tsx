import React from 'react';
import { HashRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { WorkdaysCalculator } from './components/WorkdaysCalculator';
import HolidayManager from './components/HolidayManager';
import { Header } from './components/Header';

function App() {
  return (
    <>
	  <Header />
	   <Router>
		<nav className="p-4 bg-tamu-maroon text-white">
		  <Link to="/" className="mr-4">
			Workdays Calculator
		  </Link>
		  <Link to="/manage-holidays" className="mr-4">
			Manage Holidays
		  </Link>
		</nav>
		<Routes>
		  <Route path="/" element={<WorkdaysCalculator />} />
		  <Route path="/manage-holidays" element={<HolidayManager />} />
		</Routes>
	  </Router>
	</>
  );
}

export default App;

