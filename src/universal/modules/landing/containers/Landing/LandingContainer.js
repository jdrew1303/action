import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Landing from 'universal/modules/landing/components/Landing/Landing';
import Helmet from 'react-helmet';
import {showLock} from 'universal/components/Auth0ShowLock/Auth0ShowLock';
import loginWithToken from 'universal/decorators/loginWithToken/loginWithToken';
import {showInfo} from 'universal/modules/toast/ducks/toastDuck';
import {
  APP_UPGRADE_PENDING_KEY,
  APP_UPGRADE_PENDING_FALSE,
  APP_UPGRADE_PENDING_RELOAD,
  APP_UPGRADE_PENDING_DONE
} from 'universal/utils/constants';
import {connect} from 'react-redux';

const mapStateToProps = (state) => {
  return {
    nextUrl: state.auth.nextUrl
  };
};

@loginWithToken
@connect(mapStateToProps)
export default class LandingContainer extends Component {
  static propTypes = {
    auth: PropTypes.object,
    user: PropTypes.shape({
      email: PropTypes.string,
      id: PropTypes.string,
      picture: PropTypes.string,
      preferredName: PropTypes.string
    }),
    dispatch: PropTypes.func.isRequired,
    nextUrl: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = {refreshNeeded: false};
  }

  componentWillMount() {
    if (typeof window !== 'undefined' &&
        window.sessionStorage.getItem(APP_UPGRADE_PENDING_KEY) ===
          APP_UPGRADE_PENDING_RELOAD) {
      this.setState({refreshNeeded: true});
    }
  }

  componentDidMount() {
    const {
      dispatch,
      nextUrl
    } = this.props;
    if (nextUrl) {
      showLock(dispatch);
    }
    const upgradePendingState = window.sessionStorage.getItem(APP_UPGRADE_PENDING_KEY);
    if (upgradePendingState === APP_UPGRADE_PENDING_RELOAD) {
      window.sessionStorage.setItem(APP_UPGRADE_PENDING_KEY,
        APP_UPGRADE_PENDING_DONE);
      window.location.reload();
    } else if (upgradePendingState === APP_UPGRADE_PENDING_DONE) {
      window.sessionStorage.setItem(APP_UPGRADE_PENDING_KEY,
        APP_UPGRADE_PENDING_FALSE);
      dispatch(showInfo({
        title: 'New stuff!',
        message: 'Action has been upgraded, log in to see what\'s new.',
        action: {
          label: 'Ok'
        },
        autoDismiss: 0
      }));
    }
    const script1 = document.createElement('script');
    const script2 = document.createElement('script');
    script1.src = '//fast.wistia.com/embed/medias/zoyitx0tkh.jsonp';
    script1.async = true;
    script2.src = '//fast.wistia.com/assets/external/E-v1.js';
    script2.async = true;
    document.body.appendChild(script1);
    document.body.appendChild(script2);
  }

  render() {
    let loginClickHandler;
    if (this.state.refreshNeeded) {
      loginClickHandler = () => window.location.reload();
    } else {
      const {dispatch} = this.props;
      loginClickHandler = () => showLock(dispatch);
    }
    return (
      <div>
        <Helmet title="Welcome to Action by Parabol" />
        <Landing handleLoginClick={loginClickHandler} {...this.props} />
      </div>
    );
  }
}
