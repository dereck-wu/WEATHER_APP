import React, { useState } from 'react';
import { Layout, Row, Col, Alert } from 'antd';
import LanguageSwitcher from './components/LanguageSwitcher';
import WeatherSearch from './components/WeatherSearch';
import CurrentWeather from './components/CurrentWeather';  // 添加这行导入
import HourlyForecast from './components/HourlyForecast';  // 添加这行导入
import Recommendations from './components/Recommendations';
import { translations } from './translations.jsx';

const { Header } = Layout;

function App() {
  const [currentLanguage, setCurrentLanguage] = useState('zh');
  const [cityName, setCityName] = useState('');
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const changeLanguage = (language) => {
    setCurrentLanguage(language);
  };

  const convertChineseToPinyin = (cityName) => {
    const cityMap = {
      '北京': 'beijing',
      '上海': 'shanghai',
      // ... 其他城市映射
    };
    return cityMap[cityName] || cityName;
  };

  const getAiRecommendations = async (cityName, weatherData) => {
    if (!weatherData || !weatherData.weather) {
      console.error('无效的天气数据');
      return;
    }
    setLoadingRecommendations(true);
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-036fd619e34046c8ba4f2fd7f078632a'
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{
            role: "user",
            content: `作为天气助手，请为${cityName}的游客提供建议：
            今日天气：${weatherData.weather[0].description}，温度：${Math.round(weatherData.main.temp - 273.15)}°C
            
            请用${currentLanguage === 'zh' ? '中文' : 'English'}回答：
            1. 3个适合的活动建议
            2. 3种当地特色饮食
            3. 简要说明推荐理由`
          }],
          temperature: 0.7,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.choices || !data.choices[0]) {
        throw new Error('无效的API响应格式');
      }
      
      setAiRecommendations(data.choices[0].message.content);
    } catch (err) {
      console.error('获取AI建议失败:', err);
      setError(currentLanguage === 'zh' ? `获取建议失败: ${err.message}` : `Failed to get recommendations: ${err.message}`);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // 修改getWeather函数，在获取天气后调用推荐
  const getWeather = async (cityName) => {
    const apiKey = 'd2e1741a702fa6f7be95ea9126bd5667';
    if (!cityName) {
      setError(translations[currentLanguage].errorMsg);
      return;
    }

    try {
      let formattedCityName = cityName;
      if (/[\u4e00-\u9fa5]/.test(cityName)) {
        formattedCityName = convertChineseToPinyin(cityName);
      }
      const [currentData, forecastData] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${formattedCityName}&appid=${apiKey}`).then(res => res.json()),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${formattedCityName}&appid=${apiKey}&cnt=8`).then(res => res.json())
      ]);

      if (currentData.cod === '404') {
        setError(translations[currentLanguage].notFound);
        setWeatherData(null);
        setHourlyData([]);
      } else {
        setError(null);
        setWeatherData(currentData);
        setHourlyData(forecastData.list);
        getAiRecommendations(cityName, currentData); // 传入currentData作为第二个参数
      }
    } catch (err) {
      console.error('Error:', err);
      setError('获取天气信息失败');
      setWeatherData(null);
      setHourlyData([]);
    }
  };

  return (
    <Layout className="App" style={{ 
      minHeight: '100vh',
      maxWidth: '414px', // 手机宽度限制
      margin: '0 auto', // 居中显示
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <Header style={{ 
        background: '#fff', 
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Row gutter={16} justify="center" align="middle">
          <Col>
            <LanguageSwitcher 
              currentLanguage={currentLanguage} 
              changeLanguage={changeLanguage}
            />
          </Col>
          <Col>
            <WeatherSearch 
              currentLanguage={currentLanguage} 
              getWeather={getWeather}
              cityName={cityName}
              setCityName={setCityName}
            />
          </Col>
        </Row>
      </Header>
      {error && (
        <Alert 
          message={error}
          type="error" 
          showIcon
          style={{ margin: '16px', width: 'calc(100% - 32px)' }}
        />
      )}
      {weatherData && (
        <div style={{ padding: '16px' }}>
          <CurrentWeather 
            currentLanguage={currentLanguage} 
            weatherData={weatherData}
          />
          <div style={{ 
            marginTop: '16px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <HourlyForecast 
              currentLanguage={currentLanguage} 
              hourlyData={hourlyData}
            />
            <Recommendations 
              recommendations={aiRecommendations}
              loading={loadingRecommendations}
              currentLanguage={currentLanguage}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;