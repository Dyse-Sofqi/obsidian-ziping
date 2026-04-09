// 时间设置模态框组件
import { Modal, App, Notice } from 'obsidian';
import { BaziView } from './BaziView-simplified';
import { CITIES, PROVINCE_CITY_DISTRICT_GROUPS } from '../settings';
import { findLocationInGroups } from '../utils/locationUtils';

export class TimeSettingModal extends Modal {
    view: BaziView;
    // 存储选中的时间值
    selectedYear: number;
    selectedMonth: number;
    selectedDay: number;
    selectedHour: number;
    selectedMinute: number;
    selectedSecond: number;

    constructor(app: App, view: BaziView) {
        super(app);
        this.view = view;
        // 初始化时间值
        this.selectedYear = 0;
        this.selectedMonth = 0;
        this.selectedDay = 0;
        this.selectedHour = 0;
        this.selectedMinute = 0;
        this.selectedSecond = 0;
    }

    onOpen() {
        const { contentEl } = this;
        // 选项卡
        const tabContainer = contentEl.createEl('div');
        tabContainer.addClass('ziping-flex-align-center');
        tabContainer.createEl('span', { text: '历法：' });
        const tabs = ['公历', '农历', '干支历'];
        let activeTab = 0;

        const tabButtons = tabContainer.createEl('div');
        tabButtons.addClass('ziping-flex');
        const tabButtonElements: HTMLButtonElement[] = [];
        tabs.forEach((tab, index) => {
            const btn = tabButtons.createEl('button', { text: tab });
            tabButtonElements.push(btn);
            // 设置按钮基础样式
            btn.addClass('ziping-border-radius-0', 'ziping-boxShadow-none', 'ziping-button-inactive');
            btn.addEventListener('click', () => {
                activeTab = index;
                // 更新所有按钮的样式
                tabButtonElements.forEach((button, i) => {
                    if (i === index) {
                        button.removeClass('ziping-button-inactive');
                        button.addClass('ziping-button-active');
                    } else {
                        button.removeClass('ziping-button-active');
                        button.addClass('ziping-button-inactive');
                    }
                });
                this.renderTabContent(contentEl, activeTab);
            });
        });
        // 初始化第一个按钮为选中状态
        if (tabButtonElements.length > 0 && tabButtonElements[0]) {
            tabButtonElements[0].addClass('ziping-button-active');
        }

        this.renderTabContent(contentEl, activeTab);
    }

    renderTabContent(contentEl: Element, tabIndex: number) {
        // 清除旧内容
        const existing = contentEl.querySelector('.tab-content');
        if (existing) existing.remove();

        const tabContent = contentEl.createEl('div');
        tabContent.addClass('tab-content');

        // 获取当前盘面数据
        const currentData = this.view.currentData;

        // 姓名和性别在同一行
        const nameGenderRow = tabContent.createEl('div');
        nameGenderRow.addClass('bazi-name-gender-row');
        nameGenderRow.createEl('label', { text: '姓名：' });

        let defaultName = '未命名';
        if (currentData && currentData.name && currentData.name !== '未命名') {
            // 如果当前已有有效姓名，则使用当前姓名
            defaultName = currentData.name;
        }
        const nameInput = nameGenderRow.createEl('input', {
            type: 'text',
            value: defaultName
        });
        nameInput.addClass('ziping-margin-right-10');

        // 点击后自动清除默认文本
        nameInput.addEventListener('focus', () => {
            if (nameInput.value === defaultName) {
                nameInput.value = '';
            }
        });

        // 失去焦点时，如果未填写文本则恢复默认文本
        nameInput.addEventListener('blur', () => {
            if (nameInput.value.trim() === '') {
                nameInput.value = defaultName;
            }
        });

        // 性别选择
        nameGenderRow.createEl('label', { text: '性别：' });
        const genderContainer = nameGenderRow.createEl('div');

        // 男单选按钮
        const maleRadio = genderContainer.createEl('input', {
            type: 'radio',
            value: '0'
        });
        maleRadio.setAttribute('name', 'gender');
        // 设置默认选择状态
        maleRadio.checked = currentData?.gender === 0;
        const maleLabel = genderContainer.createEl('label', { text: '男' });
        maleLabel.addClass('ziping-margin-right-10');

        // 女单选按钮
        const femaleRadio = genderContainer.createEl('input', {
            type: 'radio',
            value: '1'
        });
        femaleRadio.setAttribute('name', 'gender');
        // 设置默认选择状态
        femaleRadio.checked = currentData?.gender === 1;
        genderContainer.createEl('label', { text: '女' });

        // 标签选择
        const tagLabel = nameGenderRow.createEl('label', { text: '标签：' });
        tagLabel.addClass('ziping-margin-left-10');

        const tagSelect = nameGenderRow.createEl('select');
        tagSelect.addClass('margin-left-10', 'margin-right-10', 'ziping-border-1-ccc', 'ziping-boxShadow-none');

        // 添加标签选项
        const tagOptions = ['关注', '亲友', '名人', '古籍', '客户', '其他'];
        const defaultOption = tagSelect.createEl('option');
        defaultOption.textContent = '默认';
        defaultOption.value = '';

        tagOptions.forEach(tag => {
            const option = tagSelect.createEl('option');
            option.textContent = tag;
            option.value = tag;

            // 设置默认选择状态
            if (currentData?.tag === tag) {
                option.selected = true;
            }
        });

        if (tabIndex === 0) { // 公历
            this.renderGregorianTab(tabContent);
        } else if (tabIndex === 1) { // 农历
            this.renderLunarTab(tabContent);
        } else if (tabIndex === 2) { // 干支
            this.renderBaziTab(tabContent);
        }

        // 校时复选框
        const timeCorrectionContainer = tabContent.createEl('div');
        timeCorrectionContainer.addClass('ziping-flex-gap-0-mb-6-0-6-0');
        const timeCorrectionCheckbox = timeCorrectionContainer.createEl('input', { type: 'checkbox' });
        timeCorrectionCheckbox.id = 'time-correction-checkbox';
        timeCorrectionCheckbox.addClass('ziping-switch-checkbox');
        const timeCorrectionLabel = timeCorrectionContainer.createEl('label', { text: '校时' });
        timeCorrectionLabel.htmlFor = 'time-correction-checkbox';

        // 城市选择 - 省市区三级联动
        const cityContainer = tabContent.createEl('div');
        cityContainer.addClass('ziping-flex-gap-0-mb-6-0-6-0', 'ziping-flex-wrap');

        // 省份选择
        const provinceLabel = cityContainer.createEl('span');
        provinceLabel.setText('省：');
        const provinceSelect = cityContainer.createEl('select');
        provinceSelect.id = 'province-select';
        provinceSelect.addClass('ziping-margin-right-10', 'ziping-border-1-ccc', 'ziping-boxShadow-none');

        // 地级市选择
        const cityLabel = cityContainer.createEl('span');
        cityLabel.setText('市：');
        const citySelect = cityContainer.createEl('select');
        citySelect.id = 'city-select';
        citySelect.addClass('ziping-margin-right-10', 'ziping-border-1-ccc', 'ziping-boxShadow-none');

        // 区县选择
        const districtLabel = cityContainer.createEl('span');
        districtLabel.setText('区：');
        const districtSelect = cityContainer.createEl('select');
        districtSelect.id = 'district-select';
        districtSelect.addClass('ziping-border-1-ccc', 'ziping-boxShadow-none');

        // 管理时间校正状态函数
        const manageTimeCorrectionState = (isEnabled: boolean) => {
            // 设置城市选择容器的显示/隐藏状态
            if (!isEnabled) {
                // 未勾选校时checkbox时隐藏整个城市选择容器
                cityContainer.style.display = 'none';
            } else {
                // 勾选校时checkbox时显示整个城市选择容器
                cityContainer.style.display = 'flex';

                // 重新填充省份选择器（三级联动）
                const emptyProvinceOption = provinceSelect.createEl('option');
                emptyProvinceOption.textContent = '省份';
                emptyProvinceOption.value = '';

                PROVINCE_CITY_DISTRICT_GROUPS.forEach(group => {
                    provinceSelect.createEl('option', { text: group.province.name, value: group.province.name });
                });

                // 根据当前设置重新初始化
                const currentCity = currentData?.city || '';
                let initialProvinceName = currentData?.province || '';
                let initialCityName = currentCity;
                let initialDistrictName = currentData?.district || '';

                // 查找当前城市对应的省份和区县
                outer: for (const group of PROVINCE_CITY_DISTRICT_GROUPS) {
                    for (const city of group.cities) {
                        if (city.name === currentCity) {
                            initialProvinceName = group.province.name;

                            // 查找对应的区县数据
                            const districts = group.districts.get(city.id);
                            if (districts && districts.length > 0 && districts[0]) {
                                // 假设使用第一个区县作为默认值
                                initialDistrictName = districts[0].name;
                            }
                            break outer;
                        }
                    }
                }

                // 三级联动更新函数定义
                const updateCityAndDistrictSelect = (provinceName: string) => {
                    // 清空城市和区县下拉框
                    citySelect.innerHTML = '';
                    districtSelect.innerHTML = '';

                    // 添加初始选项
                    const emptyCityOption = citySelect.createEl('option');
                    emptyCityOption.textContent = '地级市';
                    emptyCityOption.value = '';

                    const emptyDistrictOption = districtSelect.createEl('option');
                    emptyDistrictOption.textContent = '区县';
                    emptyDistrictOption.value = '';

                    // 找到对应省份的数据
                    const group = PROVINCE_CITY_DISTRICT_GROUPS.find(g => g.province.name === provinceName);
                    if (!group) return;

                    // 添加城市选项
                    group.cities.forEach(city => {
                        citySelect.createEl('option', { text: city.name, value: city.name });
                    });
                };

                // 更新区县下拉框
                const updateDistrictSelect = (cityName: string) => {
                    districtSelect.innerHTML = '';

                    // 添加初始选项
                    const emptyDistrictOption = districtSelect.createEl('option');
                    emptyDistrictOption.textContent = '区县';
                    emptyDistrictOption.value = '';

                    // 找到对应城市的数据
                    for (const group of PROVINCE_CITY_DISTRICT_GROUPS) {
                        const city = group.cities.find(c => c.name === cityName);
                        if (city) {
                            const districts = group.districts.get(city.id);
                            if (districts && districts.length > 0) {
                                // 添加区县选项
                                districts.forEach(district => {
                                    districtSelect.createEl('option', { text: district.name, value: district.name });
                                });
                            }
                            break;
                        }
                    }
                };

                // 设置初始值
                if (initialProvinceName) {
                    provinceSelect.value = initialProvinceName;
                    updateCityAndDistrictSelect(initialProvinceName);

                    if (initialCityName) {
                        citySelect.value = initialCityName;
                        updateDistrictSelect(initialCityName);

                        if (initialDistrictName) {
                            districtSelect.value = initialDistrictName;
                        }
                    }
                }

                // 重新绑定事件（三级联动）
                // 先移除现有的事件监听器
                provinceSelect.onchange = () => {
                    updateCityAndDistrictSelect(provinceSelect.value);
                    districtSelect.innerHTML = '';
                    const emptyDistrictOption = districtSelect.createEl('option');
                    emptyDistrictOption.textContent = '区县';
                    emptyDistrictOption.value = '';
                };

                citySelect.onchange = () => {
                    updateDistrictSelect(citySelect.value);
                };
            }
        };

        // 初始状态：使用当前盘面数据的校时状态
        timeCorrectionCheckbox.checked = currentData?.timeCorrectionEnabled || false;
        manageTimeCorrectionState(timeCorrectionCheckbox.checked);

        // 复选框状态变化监听
        timeCorrectionCheckbox.addEventListener('change', () => {
            manageTimeCorrectionState(timeCorrectionCheckbox.checked);
        });

        // 按钮
        const buttonContainer = tabContent.createEl('div');
        buttonContainer.addClass('ziping-flex', 'ziping-flex-end', 'ziping-gap-10', 'ziping-margin-top-20');

        const cancelBtn = buttonContainer.createEl('button', { text: '取消' });
        cancelBtn.addEventListener('click', () => {
            this.close();
        });

        const submitBtn = buttonContainer.createEl('button', { text: '确定' });
        submitBtn.addEventListener('click', () => {
            // 根据tabIndex获取时间并计算
            let year: number;
            let month: number;
            let day: number;
            let hour: number;
            let minute: number;
            let second: number;
            const gender = parseInt(maleRadio.checked ? '0' : '1');

            // 获取选择的区县并更新设置（三级联动）
            const selectedDistrict = districtSelect.value;
            let selectedCityName = citySelect.value;
            let selectedProvinceName = provinceSelect.value;

            // 检查是否启用了校时功能（使用不同的变量名避免冲突）
            const timeCorrectionEnabledState = timeCorrectionCheckbox.checked;

            // 保存省市区信息和经纬度
            let longitude: number | undefined;
            let latitude: number | undefined;

            // 记录当前地理位置选择和校时状态
            console.debug('用户操作状态:', {
                省份: selectedProvinceName,
                城市: selectedCityName,
                区县: selectedDistrict,
                校时启用: timeCorrectionEnabledState
            });

            // 只有在校时功能启用时，才处理地理位置信息
            if (timeCorrectionEnabledState) {
                // 使用三级联动的完整地理信息
                const locationData = findLocationInGroups(selectedDistrict, selectedCityName, selectedProvinceName);
                if (locationData) {
                    // 更新排盘引擎的经纬度
                    this.view.paipan.J = locationData.longitude;
                    this.view.paipan.W = locationData.latitude;
                    longitude = locationData.longitude;
                    latitude = locationData.latitude;
                    console.debug('经纬度设置成功:', {
                        经度: locationData.longitude,
                        纬度: locationData.latitude
                    });
                } else {
                    // 如果无法找到地理数据，使用用户上次的有效地理位置或默认值
                    if (this.view.currentData?.longitude && this.view.currentData?.latitude) {
                        // 使用上次的有效地理位置
                        this.view.paipan.J = this.view.currentData.longitude;
                        this.view.paipan.W = this.view.currentData.latitude;
                        longitude = this.view.currentData.longitude;
                        latitude = this.view.currentData.latitude;
                        console.debug('使用上次有效地理位置:', { 经度: longitude, 纬度: latitude });
                    } else {
                        // 使用默认位置（北京市中心）
                        const defaultLongitude = 116.4074;
                        const defaultLatitude = 39.9042;
                        this.view.paipan.J = defaultLongitude;
                        this.view.paipan.W = defaultLatitude;
                        longitude = defaultLongitude;
                        latitude = defaultLatitude;
                        console.debug('使用默认地理位置（北京）:', {
                            经度: defaultLongitude,
                            纬度: defaultLatitude
                        });
                    }
                }

                // 确保经纬度数据有值
                if (longitude === undefined || latitude === undefined) {
                    longitude = 116.4074;
                    latitude = 39.9042;
                }
            } else {
                // 校时功能未启用，清除经纬度设置
                longitude = undefined;
                latitude = undefined;
                console.debug('校时功能未启用，不设置经纬度');
            }

            void this.view.plugin.saveSettings();

            // 保存省市区信息和校时状态到当前八字数据
            if (this.view.currentData) {
                this.view.currentData.province = selectedProvinceName;
                this.view.currentData.city = selectedCityName;
                this.view.currentData.district = selectedDistrict;
                this.view.currentData.longitude = longitude;
                this.view.currentData.latitude = latitude;
                this.view.currentData.timeCorrectionEnabled = timeCorrectionEnabledState;
                this.view.currentData.gender = gender;

                console.debug('数据保存完成:', {
                    省市区: `${selectedProvinceName} ${selectedCityName} ${selectedDistrict}`,
                    经纬度: [longitude, latitude],
                    校时启用: timeCorrectionEnabledState
                });
            }

            if (tabIndex === 0) {
                // 公历
                const timeContainer = tabContent.querySelector('.bazi-time-selectors');
                if (!timeContainer) {
                    new Notice('无法找到时间选择器容器');
                    return;
                }
                const selects = timeContainer.querySelectorAll('select');
                year = parseInt((selects[0] as HTMLSelectElement).value);
                month = parseInt((selects[1] as HTMLSelectElement).value);
                day = parseInt((selects[2] as HTMLSelectElement).value);
                hour = parseInt((selects[3] as HTMLSelectElement).value);
                minute = parseInt((selects[4] as HTMLSelectElement).value);
                // 使用当前盘面的秒级信息
                second = this.view.currentData?.second ?? new Date().getSeconds();
            } else if (tabIndex === 1) {
                // 农历 - 需要转换
                const timeContainer = tabContent.querySelector('.bazi-time-selectors');
                if (!timeContainer) {
                    new Notice('无法找到时间选择器容器');
                    return;
                }
                const selects = timeContainer.querySelectorAll('select');
                const lunarYear = parseInt((selects[0] as HTMLSelectElement).value);
                const monthValue = parseInt((selects[1] as HTMLSelectElement).value);
                // 判断是否为闰月（大于12的值表示闰月）
                const isLeap = monthValue > 12;
                const lunarMonth = isLeap ? monthValue - 12 : monthValue;
                const lunarDay = parseInt((selects[2] as HTMLSelectElement).value);
                hour = parseInt((selects[3] as HTMLSelectElement).value);
                minute = parseInt((selects[4] as HTMLSelectElement).value);
                // 使用当前盘面的秒级信息
                second = this.view.currentData?.second ?? new Date().getSeconds();

                // 调用paipan.js中的Lunar2Solar方法将农历转换为公历
                const solarDate = this.view.paipan.lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeap);
                if (!solarDate) {
                    new Notice('农历转换失败，请检查输入的农历日期');
                    return;
                }
                year = solarDate.year;
                month = solarDate.month;
                day = solarDate.day;
            } else {
                // 干支 - 使用筛选出来的选中的可选项的公历时间排盘
                const now = new Date();
                year = this.selectedYear || now.getFullYear();
                month = this.selectedMonth || now.getMonth() + 1;
                day = this.selectedDay || now.getDate();
                hour = this.selectedHour || now.getHours();
                minute = this.selectedMinute || 0;
                second = this.selectedSecond || 0;
            }

            // 获取姓名信息、标签和时间校准状态
            const name = nameInput.value || '未命名';
            const tag = tagSelect.value;
            const timeCorrectionEnabledValue = timeCorrectionCheckbox.checked;
            void this.view.calculateAndDisplay(year, month, day, hour, minute, second, gender, name, timeCorrectionEnabledValue, tag);
            this.close();
        });
    }

    renderGregorianTab(container: Element) {
        const now = new Date();
        const currentData = this.view.currentData;
        const currentYear = currentData?.year ?? now.getFullYear();
        const currentMonth = currentData?.month ?? now.getMonth() + 1;
        const currentDay = currentData?.day ?? now.getDate();
        const currentHour = currentData?.hour ?? now.getHours();
        const currentMinute = currentData?.minute ?? now.getMinutes();

        // 创建时间选择容器，所有下拉列表在同一行
        const timeRow = container.createEl('div');
        timeRow.addClass('bazi-time-selectors');

        // 时间标签
        timeRow.createEl('label', { text: '时间：' });

        // 年
        const yearSelect = timeRow.createEl('select');
        yearSelect.addClass('ziping-time-selectList');
        for (let y = 1600; y <= 2100; y++) {
            yearSelect.createEl('option', { text: y.toString(), value: y.toString() });
        }
        yearSelect.value = currentYear.toString();

        // 月
        const monthSelect = timeRow.createEl('select');
        monthSelect.addClass('ziping-time-selectList');
        for (let m = 1; m <= 12; m++) {
            monthSelect.createEl('option', { text: m.toString(), value: m.toString() });
        }
        monthSelect.value = currentMonth.toString();

        // 日
        const daySelect = timeRow.createEl('select');
        daySelect.addClass('ziping-time-selectList');
        for (let d = 1; d <= 31; d++) {
            daySelect.createEl('option', { text: d.toString(), value: d.toString() });
        }
        daySelect.value = currentDay.toString();

        // 时
        const hourSelect = timeRow.createEl('select');
        hourSelect.addClass('ziping-time-selectList');
        for (let h = 0; h < 24; h++) {
            hourSelect.createEl('option', { text: h.toString(), value: h.toString() });
        }
        hourSelect.value = currentHour.toString();

        // 分
        const minuteSelect = timeRow.createEl('select');
        minuteSelect.addClass('ziping-time-selectList');
        for (let m = 0; m < 60; m++) {
            minuteSelect.createEl('option', { text: m.toString(), value: m.toString() });
        }
        minuteSelect.value = currentMinute.toString();
    }

    renderLunarTab(container: Element) {
        const now = new Date();
        const currentData = this.view.currentData;

        // 获取当前日期的农历信息作为默认值
        let currentYear = now.getFullYear();
        let currentMonth = now.getMonth() + 1;
        let currentDay = now.getDate();
        let currentHour = now.getHours();
        let currentMinute = now.getMinutes();

        if (currentData) {
            const lunarDate = this.view.paipan.getLunarDate(currentData.year, currentData.month, currentData.day);
            if (lunarDate) {
                currentYear = lunarDate.year;
                currentMonth = lunarDate.month;
                currentDay = lunarDate.day;
            }
            currentHour = currentData.hour;
            currentMinute = currentData.minute;
        }

        // 创建时间选择容器，所有下拉列表在同一行
        const timeRow = container.createEl('div');
        timeRow.addClass('bazi-time-selectors');
        timeRow.addClass('ziping-flex-gap-0-mb-6-0-6-0', 'ziping-flex-align-center');
        timeRow.createEl('label', { text: '时间：' });

        // 年
        const yearSelect = timeRow.createEl('select');
        yearSelect.addClass('ziping-time-selectList');
        for (let y = 1900; y <= 2100; y++) {
            yearSelect.createEl('option', { text: y.toString(), value: y.toString() });
        }
        yearSelect.value = currentYear.toString();

        // 月
        const monthSelect = timeRow.createEl('select');
        monthSelect.addClass('ziping-time-selectList');

        // 根据年份获取月份列表，包括闰月
        const updateMonthOptions = (year: number) => {
            monthSelect.innerHTML = '';
            const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

            // 获取该年的闰月信息
            const leapMonth = this.view.paipan.getLeapMonth(year);

            // 添加普通月份
            for (let m = 1; m <= 12; m++) {
                const value = m.toString();
                const text = monthNames[m - 1];
                monthSelect.createEl('option', { text, value });
            }

            // 如果有闰月，添加闰月选项
            if (leapMonth > 0) {
                const leapValue = (leapMonth + 12).toString(); // 使用大于12的值表示闰月
                const leapText = '闰' + monthNames[leapMonth - 1];
                monthSelect.createEl('option', { text: leapText, value: leapValue });
            }

            // 尝试保持之前选中的月份
            if (currentMonth <= 12) {
                monthSelect.value = currentMonth.toString();
            } else if (leapMonth > 0 && currentMonth - 12 === leapMonth) {
                monthSelect.value = (leapMonth + 12).toString();
            }
        };

        // 初始化月份选项
        updateMonthOptions(currentYear);

        // 年份变化时更新月份选项
        yearSelect.addEventListener('change', () => {
            const year = parseInt(yearSelect.value);
            updateMonthOptions(year);
        });

        // 日
        const daySelect = timeRow.createEl('select');
        daySelect.addClass('ziping-time-selectList');
        const dayNames = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
            '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
            '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
        for (let d = 1; d <= 30; d++) {
            daySelect.createEl('option', { text: dayNames[d - 1], value: d.toString() });
        }
        daySelect.value = currentDay.toString();

        // 时
        const hourSelect = timeRow.createEl('select');
        hourSelect.addClass('ziping-time-selectList');
        for (let h = 0; h < 24; h++) {
            hourSelect.createEl('option', { text: h.toString(), value: h.toString() });
        }
        hourSelect.value = currentHour.toString();

        // 分
        const minuteSelect = timeRow.createEl('select');
        minuteSelect.addClass('ziping-time-selectList');
        for (let m = 0; m < 60; m++) {
            minuteSelect.createEl('option', { text: m.toString(), value: m.toString() });
        }
        minuteSelect.value = currentMinute.toString();
    }

    renderBaziTab(container: Element) {
        // 获取当前公历时间
        const currentData = this.view.currentData;
        const now = new Date();
        const year = currentData?.year ?? now.getFullYear();
        const month = currentData?.month ?? now.getMonth() + 1;
        const day = currentData?.day ?? now.getDate();
        const hour = currentData?.hour ?? now.getHours();

        // 调用paipan.js中的方法计算干支
        const baziResult = this.view.paipan.fatemaps(0, year, month, day, hour, 0, 0);
        // gztg是天干数组，dz是地支数组
        const bazi = {
            yearGan: baziResult.gztg[0],
            monthGan: baziResult.gztg[1],
            dayGan: baziResult.gztg[2],
            hourGan: baziResult.gztg[3],
            yearZhi: baziResult.dz[0],
            monthZhi: baziResult.dz[1],
            dayZhi: baziResult.dz[2],
            hourZhi: baziResult.dz[3]
        };

        const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
        const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        const yangGan = ['甲', '丙', '戊', '庚', '壬'];
        const yinGan = ['乙', '丁', '己', '辛', '癸'];
        const yangZhi = ['子', '寅', '辰', '午', '申', '戌'];
        const yinZhi = ['丑', '卯', '巳', '未', '酉', '亥'];

        // 第一排：天干下拉列表
        const ganRow = container.createEl('div');
        ganRow.addClass('Gan-cList');

        // 年柱天干
        const yearGanSelect = ganRow.createEl('select');
        ganList.forEach(gan => {
            yearGanSelect.createEl('option', { text: gan, value: gan });
        });
        // 设置年干的默认值为计算值
        if (bazi?.yearGan) {
            yearGanSelect.value = bazi.yearGan;
        }

        // 月柱天干（不可选，由年干和月支自动计算）
        const monthGanSelect = ganRow.createEl('select');
        monthGanSelect.disabled = true; // 设置为不可选
        ganList.forEach(gan => {
            monthGanSelect.createEl('option', { text: gan, value: gan });
        });

        // 日柱天干
        const dayGanSelect = ganRow.createEl('select');
        ganList.forEach(gan => {
            dayGanSelect.createEl('option', { text: gan, value: gan });
        });
        // 设置日干的默认值为计算值
        if (bazi?.dayGan) {
            dayGanSelect.value = bazi.dayGan;
        }

        // 时柱天干（不可选，由日干和时支自动计算）
        const hourGanSelect = ganRow.createEl('select');
        hourGanSelect.disabled = true; // 设置为不可选
        ganList.forEach(gan => {
            hourGanSelect.createEl('option', { text: gan, value: gan });
        });

        // 第二排：地支下拉列表
        const zhiRow = container.createEl('div');
        zhiRow.addClass('Zhi-cList');

        // 年柱地支
        const yearZhiSelect = zhiRow.createEl('select');
        const updateYearZhiOptions = () => {
            const selectedGan = yearGanSelect.value;
            yearZhiSelect.innerHTML = '';
            const zhiOptions = yangGan.includes(selectedGan) ? yangZhi : yinZhi;
            zhiOptions.forEach(zhi => {
                yearZhiSelect.createEl('option', { text: zhi, value: zhi });
            });
        };
        yearGanSelect.addEventListener('change', updateYearZhiOptions);
        updateYearZhiOptions(); // 初始化年柱地支选项
        // 设置年支的默认值为计算值
        if (bazi?.yearZhi) {
            yearZhiSelect.value = bazi.yearZhi;
        }

        // 月柱地支
        const monthZhiSelect = zhiRow.createEl('select');
        // 五虎遁：根据年干和月支确定月干
        const updateMonthGanByYear = () => {
            const yearGan = yearGanSelect.value;
            const monthZhi = monthZhiSelect.value;

            // 五虎遁
            const yinMonthGan: { [key: string]: string } = {
                '甲': '丙', '己': '丙', '乙': '戊', '庚': '戊',
                '丙': '庚', '辛': '庚', '丁': '壬', '壬': '壬', '戊': '甲', '癸': '甲'
            };

            // 地支顺序：子丑寅卯辰巳午未申酉戌亥
            const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
            const monthIndex = zhiOrder.indexOf(monthZhi);
            const yinIndex = zhiOrder.indexOf('寅');

            // 计算月干：从寅月开始，每过一个月，月干向后推一位
            const yinGan = yinMonthGan[yearGan];
            if (!yinGan) return; // 如果找不到对应的寅月天干，则不更新
            const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
            const yinGanIndex = ganOrder.indexOf(yinGan);
            // 计算从寅月到当前月的偏移量
            let monthOffset = monthIndex - yinIndex;
            if (monthOffset < 0) {
                monthOffset += 12; // 处理跨年情况
            }
            const monthGanIndex = (yinGanIndex + monthOffset) % 10;
            const monthGan = ganOrder[monthGanIndex];

            // 设置月干的选中值
            if (monthGan) {
                monthGanSelect.value = monthGan;
            }
        };

        // 初始化月支选项
        zhiList.forEach(zhi => {
            monthZhiSelect.createEl('option', { text: zhi, value: zhi });
        });
        // 设置月支的默认值为计算值
        if (bazi?.monthZhi) {
            monthZhiSelect.value = bazi.monthZhi;
        }

        // 添加事件监听
        yearGanSelect.addEventListener('change', updateMonthGanByYear);
        monthZhiSelect.addEventListener('change', updateMonthGanByYear);

        // 初始化月干
        updateMonthGanByYear();

        // 日柱地支
        const dayZhiSelect = zhiRow.createEl('select');
        const updateDayZhiOptions = () => {
            const selectedGan = dayGanSelect.value;
            dayZhiSelect.innerHTML = '';
            const zhiOptions = yangGan.includes(selectedGan) ? yangZhi : yinZhi;
            zhiOptions.forEach(zhi => {
                dayZhiSelect.createEl('option', { text: zhi, value: zhi });
            });
        };
        dayGanSelect.addEventListener('change', updateDayZhiOptions);
        updateDayZhiOptions(); // 初始化日柱地支选项
        // 设置日支的默认值为计算值
        if (bazi?.dayZhi) {
            dayZhiSelect.value = bazi.dayZhi;
        }

        // 时柱地支
        const hourZhiSelect = zhiRow.createEl('select');
        zhiList.forEach(zhi => {
            hourZhiSelect.createEl('option', { text: zhi, value: zhi });
        });
        // 添加晚子时选项（23:00-24:00）
        hourZhiSelect.createEl('option', { text: '子', value: '晚子时' });
        // 设置时支的默认值为计算值
        if (bazi?.hourZhi) {
            hourZhiSelect.value = bazi.hourZhi;
        }

        // 五鼠遁：根据日干和时支确定时干
        const updateHourGanByDay = () => {
            const dayGan = dayGanSelect.value;
            const hourZhi = hourZhiSelect.value;

            // 五鼠遁
            const ziHourGan: { [key: string]: string } = {
                '甲': '甲', '己': '甲', '乙': '丙', '庚': '丙',
                '丙': '戊', '辛': '戊', '丁': '庚', '壬': '庚', '戊': '壬', '癸': '壬'
            };

            // 地支顺序：子丑寅卯辰巳午未申酉戌亥
            const zhiOrder = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
            let hourGan: string = '';

            if (hourZhi === '晚子时') {
                // 晚子时（23:00-24:00）：日柱前移一柱，时干使用下一个日干的子时天干
                const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
                const dayGanIndex = ganOrder.indexOf(dayGan);
                if (dayGanIndex !== -1) {
                    const nextDayGan = ganOrder[(dayGanIndex + 1) % 10]; // 下一个日干
                    if (nextDayGan) {
                        const nextZiGan = ziHourGan[nextDayGan];
                        if (nextZiGan) {
                            hourGan = nextZiGan; // 使用下一个日干的子时天干
                        }
                    }
                }
            } else {
                const hourIndex = zhiOrder.indexOf(hourZhi);
                const ziIndex = zhiOrder.indexOf('子');
                // 计算时干：从子时开始，每过一个时辰，时干向后推一位
                const ziGan = ziHourGan[dayGan];
                if (!ziGan) return; // 如果找不到对应的子时天干，则不更新
                const ganOrder = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
                const ziGanIndex = ganOrder.indexOf(ziGan);
                const hourGanIndex = (ziGanIndex + hourIndex - ziIndex + 10) % 10;
                const calculatedHourGan = ganOrder[hourGanIndex];
                if (calculatedHourGan) { hourGan = calculatedHourGan; }
            }
            // 设置时干的选中值
            if (hourGan) { hourGanSelect.value = hourGan; }
        };

        dayGanSelect.addEventListener('change', updateHourGanByDay);
        hourZhiSelect.addEventListener('change', updateHourGanByDay);

        // 初始化时干
        updateHourGanByDay();

        // 添加筛选按钮
        const filterButton = container.createEl('button', { text: '筛选时间', cls: 'mod-cta' });
        filterButton.addClass('ziping-margin-top-20', 'ziping-margin-bottom-10');

        // 创建结果展示区域
        const resultContainer = container.createEl('div', {
            cls: 'bazi-filter-result'
        });
        resultContainer.addClass('ziping-margin-top-5', 'ziping-border-1-ddd', 'ziping-border-radius-5', 'ziping-max-height-300', 'ziping-overflow-y-auto');

        // 筛选按钮点击事件
        filterButton.addEventListener('click', () => {
            // 获取用户选择的四柱干支
            const selectedYearGan = yearGanSelect.value;
            const selectedYearZhi = yearZhiSelect.value;
            const selectedMonthGan = monthGanSelect.value;
            const selectedMonthZhi = monthZhiSelect.value;
            const selectedDayGan = dayGanSelect.value;
            const selectedDayZhi = dayZhiSelect.value;
            const selectedHourGan = hourGanSelect.value;
            const selectedHourZhi = hourZhiSelect.value;
            const isLateZi = selectedHourZhi === '晚子时';
            const actualHourZhi = isLateZi ? '子' : selectedHourZhi;

            // 清空结果区域
            resultContainer.empty();
            // 使用setTimeout避免阻塞UI
            setTimeout(() => {
                try {
                    // 调用筛选方法
                    const results = this.view.paipan.filterBaziByFourPillars(
                        selectedYearGan, selectedYearZhi,
                        selectedMonthGan, selectedMonthZhi,
                        selectedDayGan, selectedDayZhi,
                        selectedHourGan, actualHourZhi,
                        isLateZi
                    );

                    // 清空结果区域
                    resultContainer.empty();

                    // 显示筛选结果
                    if (results.length === 0) {
                        resultContainer.createEl('p', { text: '未找到符合条件的日期' });
                    } else {
                        // 创建结果列表
                        const resultList = resultContainer.createEl('ul');
                        resultList.addClass('ziping-list-style-none', 'ziping-padding-0', 'ziping-margin-0');

                        // 添加每个结果
                        results.forEach(result => {
                            const listItem = resultList.createEl('li');
                            listItem.addClass('ziping-list-item-padding');

                            // 格式化日期时间为YYYY.MM.DD-HH.00
                            const formattedDate = `${String(result.year).padStart(4, '0')}.${String(result.month).padStart(2, '0')}.${String(result.day).padStart(2, '0')}-${String(result.hour).padStart(2, '0')}.00`;
                            listItem.setText(formattedDate);

                            // 添加点击事件，点击后仅存储选择的时间
                            listItem.addEventListener('click', () => {
                                // 存储选中的时间值
                                this.selectedYear = result.year;
                                this.selectedMonth = result.month;
                                this.selectedDay = result.day;
                                this.selectedHour = result.hour;
                                this.selectedMinute = 0;
                                this.selectedSecond = 0;

                                // 更新UI显示
                                const formattedDate = `${String(result.year).padStart(4, '0')}.${String(result.month).padStart(2, '0')}.${String(result.day).padStart(2, '0')}-${String(result.hour).padStart(2, '0')}.00`;
                                listItem.setText(`已选中: ${formattedDate}`);
                            });

                            // 添加悬停效果
                            listItem.addClass('ziping-transition-bg');
                            listItem.addEventListener('mouseenter', () => {
                                listItem.addClass('ziping-background-f5f5f5');
                            });
                            listItem.addEventListener('mouseleave', () => {
                                listItem.removeClass('ziping-background-f5f5f5');
                            });
                        });
                    }
                } catch (error) {
                    resultContainer.empty();
                    resultContainer.createEl('p', {
                        text: `筛选出错: ${(error as Error).message}`,
                        cls: 'error-message'
                    });
                }
            }, 100);
        });
    }
}